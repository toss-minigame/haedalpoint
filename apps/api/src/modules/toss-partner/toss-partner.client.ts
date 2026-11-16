import { Inject, Injectable } from '@nestjs/common';
import { PARTNER_TRANSPORT, type PartnerTransport } from './toss-partner.transport.js';

export const ANON_KEY_EXCHANGE_PATH = '/api-partner/v1/apps-in-toss/users/anon-key/exchange';

export const PROMOTION_GET_KEY_PATH =
  '/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key';
export const PROMOTION_EXECUTE_PATH = '/api-partner/v1/apps-in-toss/promotion/execute-promotion';
export const PROMOTION_RESULT_PATH = '/api-partner/v1/apps-in-toss/promotion/execution-result';

/** 익명 사용자 인증 코드가 유효하지 않음 (만료·재사용·위조) */
export const ANON_AUTH_CODE_INVALID = '4011';

/** 프로모션 지급 결과 (execution-result). FAILED 면 쓴 예산이 롤백된 것이다 */
export type PromotionExecutionResult = 'PENDING' | 'SUCCESS' | 'FAILED';

const PROMOTION_RESULTS: readonly string[] = ['PENDING', 'SUCCESS', 'FAILED'];

export interface PromotionPayment {
  anonKey: string;
  promotionCode: string;
  /** get-key 로 받은 지급 키 (1시간 유효, 한 번만 쓸 수 있음) */
  key: string;
  amount: number;
}

/**
 * 파트너 API 실패. HTTP 200 이어도 resultType 이 SUCCESS 가 아니면 실패다.
 * errorCode 는 문서마다 숫자·문자열 표기가 달라 문자열로 맞춘다.
 */
export class TossPartnerError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string | null,
    readonly reason: string,
  ) {
    super(`Toss partner API failed (status=${status}, errorCode=${errorCode ?? '-'}): ${reason}`);
    this.name = 'TossPartnerError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFailure(status: number, body: unknown): TossPartnerError {
  if (!isRecord(body)) return new TossPartnerError(status, null, 'JSON 이 아닌 응답');
  const error = body.error;
  // OAuth 형식 실패 ({ "error": "invalid_grant" }) 도 실패로 본다
  if (typeof error === 'string') return new TossPartnerError(status, error, error);
  if (isRecord(error)) {
    const code = error.errorCode;
    return new TossPartnerError(
      status,
      typeof code === 'string' || typeof code === 'number' ? String(code) : null,
      typeof error.reason === 'string' ? error.reason : 'unknown',
    );
  }
  return new TossPartnerError(status, null, `resultType=${String(body.resultType)}`);
}

/** resultType 이 SUCCESS 인 봉투의 success 값을 꺼낸다 (객체가 아닐 수도 있다). 그 밖은 모두 TossPartnerError */
function unwrapSuccessValue(status: number, body: unknown): unknown {
  if (status !== 200 || !isRecord(body) || body.resultType !== 'SUCCESS') {
    throw toFailure(status, body);
  }
  return body.success;
}

/** resultType 이 SUCCESS 인 봉투의 success 객체를 꺼낸다. 그 밖은 모두 TossPartnerError */
function unwrapSuccess(status: number, body: unknown): Record<string, unknown> {
  if (status !== 200 || !isRecord(body) || body.resultType !== 'SUCCESS') {
    throw toFailure(status, body);
  }
  if (!isRecord(body.success)) {
    throw new TossPartnerError(status, null, 'success 필드가 없습니다');
  }
  return body.success;
}

// 앱인토스 파트너 API(mTLS) 호출. 응답 봉투 해석은 이 클래스 안에서만 한다.
@Injectable()
export class TossPartnerClient {
  constructor(@Inject(PARTNER_TRANSPORT) private readonly transport: PartnerTransport) {}

  /** 일회용 인증 코드를 익명 사용자 식별 키(anonKey)로 교환한다 */
  async exchangeAnonAuthCode(code: string): Promise<string> {
    const { status, body } = await this.transport({
      method: 'POST',
      path: ANON_KEY_EXCHANGE_PATH,
      body: { code },
    });
    const { anonKey } = unwrapSuccess(status, body);
    if (typeof anonKey !== 'string' || anonKey.length === 0) {
      throw new TossPartnerError(status, null, 'anonKey 가 없습니다');
    }
    return anonKey;
  }

  /** 프로모션 리워드 지급 키를 받는다 (1시간 유효). 대상은 서버가 교환으로 받은 익명키다 */
  async getPromotionKey(anonKey: string): Promise<string> {
    const { status, body } = await this.transport({
      method: 'POST',
      path: PROMOTION_GET_KEY_PATH,
      headers: { 'x-anon-key': anonKey },
    });
    const { key } = unwrapSuccess(status, body);
    if (typeof key !== 'string' || key.length === 0) {
      throw new TossPartnerError(status, null, '지급 key 가 없습니다');
    }
    return key;
  }

  /** 받은 지급 키로 토스 포인트를 지급한다. 실제 지급은 늦을 수 있어 결과는 getPromotionResult 로 확인한다 */
  async executePromotion(payment: PromotionPayment): Promise<void> {
    const { anonKey, promotionCode, key, amount } = payment;
    const { status, body } = await this.transport({
      method: 'POST',
      path: PROMOTION_EXECUTE_PATH,
      headers: { 'x-anon-key': anonKey },
      body: { promotionCode, key, amount },
    });
    unwrapSuccess(status, body);
  }

  /** 지급 키로 지급 결과를 조회한다 */
  async getPromotionResult(
    anonKey: string,
    promotionCode: string,
    key: string,
  ): Promise<PromotionExecutionResult> {
    const { status, body } = await this.transport({
      method: 'POST',
      path: PROMOTION_RESULT_PATH,
      headers: { 'x-anon-key': anonKey },
      body: { promotionCode, key },
    });
    const result = unwrapSuccessValue(status, body);
    if (typeof result !== 'string' || !PROMOTION_RESULTS.includes(result)) {
      throw new TossPartnerError(status, null, `알 수 없는 지급 결과: ${String(result)}`);
    }
    return result as PromotionExecutionResult;
  }
}
