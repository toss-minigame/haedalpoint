import type { TossPointGrantStatus } from '@haedalpoint/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntityManager } from 'typeorm';
import type { Env } from '../../config/env.validation.js';
import {
  type PromotionExecutionResult,
  TossPartnerClient,
  TossPartnerError,
} from '../toss-partner/toss-partner.client.js';
import { UsersService } from '../users/users.service.js';
import type { TossPointGrant } from './entities/toss-point-grant.entity.js';
import { type CreateTossPointGrantData, TossPointRepository } from './toss-point.repository.js';

/** 다음 시도까지 기다리는 시간. 프로모션 API 는 사용자당 분당 10회까지라 넉넉히 둔다 */
const RETRY_DELAY_MS = 60 * 1000;
/** 이만큼 실패하면 FAILED 로 두고 더 시도하지 않는다 (운영자가 확인) */
export const MAX_GRANT_ATTEMPTS = 20;
/** 지급 내역을 찾을 수 없음 = 그 지급 키로는 지급되지 않았다 */
const RESULT_NOT_FOUND = '4111';
/** 서버 시작 시 익명키 대신 넣어 둔 값 (마이그레이션 UsersAnonKey). 프로모션 대상이 될 수 없다 */
const LEGACY_ANON_KEY_PREFIX = 'legacy:';

/** 지급을 더 시도하지 않을 사유 */
class GrantRejected extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function errorCodeOf(error: unknown): string {
  if (error instanceof GrantRejected) return error.code;
  if (error instanceof TossPartnerError) return error.errorCode ?? `HTTP_${error.status}`;
  return error instanceof Error ? error.name : 'UNKNOWN';
}

// 토스 포인트 지급 (프로모션 API, docs/design/toss-point-grant.md)
//
// 1) 보상을 기록하는 쪽이 같은 트랜잭션에서 PENDING 지급 건을 만든다 (createGrant).
// 2) 커밋한 뒤 settle 로 지급한다: 지급 키 받기 → 키 저장 → 지급 요청 → 결과 조회.
// 3) 실패하거나 결과가 PENDING 이면 다음 조회(settlePending) 때 다시 시도한다.
//    저장해 둔 키가 있으면 먼저 결과를 조회해서, 이미 지급된 건을 새 키로 또 주지 않는다.
@Injectable()
export class TossPointService {
  private readonly logger = new Logger(TossPointService.name);

  constructor(
    private readonly tossPointRepository: TossPointRepository,
    private readonly tossPartnerClient: TossPartnerClient,
    private readonly usersService: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** 지급 건을 PENDING 으로 만든다. 보상 기록과 같은 트랜잭션 안에서 부른다 */
  createGrant(manager: EntityManager, data: CreateTossPointGrantData): Promise<TossPointGrant> {
    return this.tossPointRepository.create(manager, data);
  }

  /** 아직 지급되지 않은 토스 포인트 합계 (원) */
  async pendingAmount(userId: string): Promise<number> {
    const pending = await this.tossPointRepository.findPendingByUserId(userId);
    return pending.reduce((sum, grant) => sum + grant.amount, 0);
  }

  /** 사용자의 PENDING 지급 건을 다시 시도한다. 실패해도 던지지 않는다 */
  async settlePending(userId: string, now: Date = new Date()): Promise<void> {
    const pending = await this.tossPointRepository.findPendingByUserId(userId);
    for (const grant of pending) {
      await this.settle(grant.id, now);
    }
  }

  /**
   * 지급 건 하나를 처리하고 처리한 뒤의 상태를 돌려준다. 실패해도 던지지 않는다.
   * 다른 요청이 처리 중이거나 다음 시도 시각 전이면 아무것도 하지 않고 PENDING.
   */
  async settle(grantId: string, now: Date = new Date()): Promise<TossPointGrantStatus> {
    // 프로모션 코드가 아직 없으면 시도하지 않는다. 실패로 세지 않아야 코드를 설정한 뒤 그대로 지급된다
    // (실패로 세면 MAX_GRANT_ATTEMPTS 번 조회한 뒤 FAILED 가 되어 영영 지급되지 않는다)
    const promotionCode = this.config.get('TOSS_ATTENDANCE_PROMOTION_CODE', { infer: true });
    if (!promotionCode) return 'PENDING';

    const grant = await this.tossPointRepository.claim(
      grantId,
      now,
      new Date(now.getTime() + RETRY_DELAY_MS),
    );
    if (!grant) return 'PENDING';

    try {
      const granted = await this.attempt(grant, promotionCode);
      if (!granted) return 'PENDING';
      await this.tossPointRepository.update(grant.id, {
        status: 'SUCCESS',
        grantedAt: new Date(),
        lastError: null,
      });
      return 'SUCCESS';
    } catch (error) {
      return this.recordFailure(grant, error);
    }
  }

  /** 지급이 확인되면 true, 지급 요청은 됐지만 아직 처리 중이면 false */
  private async attempt(grant: TossPointGrant, promotionCode: string): Promise<boolean> {
    const { anonKey } = await this.usersService.findById(grant.userId);
    if (anonKey.startsWith(LEGACY_ANON_KEY_PREFIX)) throw new GrantRejected('NO_ANON_KEY');

    if (grant.rewardKey) {
      const previous = await this.resultOf(anonKey, promotionCode, grant.rewardKey);
      if (previous === 'SUCCESS') return true;
      if (previous === 'PENDING') return false;
      // FAILED(예산 롤백) 이거나 그 키로 지급된 적이 없으면 새 키로 다시 지급한다
    }

    const key = await this.tossPartnerClient.getPromotionKey(anonKey);
    // 지급 요청 전에 키를 남긴다. 요청 뒤 응답을 못 받아도 다음 시도에서 이 키로 결과를 확인한다
    await this.tossPointRepository.update(grant.id, { rewardKey: key });
    await this.tossPartnerClient.executePromotion({
      anonKey,
      promotionCode,
      key,
      amount: grant.amount,
    });
    return (await this.resultOf(anonKey, promotionCode, key)) === 'SUCCESS';
  }

  /** 지급 결과. 그 키로 지급된 내역이 없으면 null */
  private async resultOf(
    anonKey: string,
    promotionCode: string,
    key: string,
  ): Promise<PromotionExecutionResult | null> {
    try {
      return await this.tossPartnerClient.getPromotionResult(anonKey, promotionCode, key);
    } catch (error) {
      if (error instanceof TossPartnerError && error.errorCode === RESULT_NOT_FOUND) return null;
      throw error;
    }
  }

  private async recordFailure(
    grant: TossPointGrant,
    error: unknown,
  ): Promise<TossPointGrantStatus> {
    const attempts = grant.attempts + 1;
    const lastError = errorCodeOf(error);
    const gaveUp = error instanceof GrantRejected || attempts >= MAX_GRANT_ATTEMPTS;
    const status: TossPointGrantStatus = gaveUp ? 'FAILED' : 'PENDING';
    // 익명키·인증서 값은 남기지 않는다 (지급 건 id 와 오류 코드만)
    this.logger.warn(
      `토스 포인트 지급 실패 (grant=${grant.id}, attempts=${attempts}, error=${lastError}, status=${status})`,
    );
    await this.tossPointRepository.update(grant.id, { attempts, lastError, status });
    return status;
  }
}
