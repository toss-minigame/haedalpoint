import type {
  FishingAdBoostResponse,
  FishingStatusResponse,
  StoreFishResponse,
  WarehouseResponse,
} from '@haedalpoint/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { AD_ROD_POLICY, HAMMOCK_EXPAND_POLICY } from '../../common/globals/index.js';
import { kstDayStart, kstMonthStart, toKstDateString } from '../../common/utils/kst-date.js';
import { UsersService } from '../users/users.service.js';
import type { FishingState } from './entities/fishing-state.entity.js';
import { FishingRepository, type FishingStateChanges } from './fishing.repository.js';
import { NANO_PER_FISH, rodSpeedBonusPercent } from './lib/fishing-rate.js';
import {
  buildFishingStatus,
  isCoolingDown,
  toHammockState,
  toStateChanges,
} from './lib/fishing-status.js';
import {
  applyBait,
  enhanceRod,
  expandHammock,
  summonOtterFriend,
  takeAllFish,
} from './lib/hammock-actions.js';
import { boostsOn, type HammockState, settleHammock } from './lib/settle-hammock.js';

const NOTHING_TO_STORE = '해먹에 저장할 물고기가 없어요';
const AD_ROD_COOLING_DOWN = `낚싯대는 ${AD_ROD_POLICY.COOLDOWN_MINUTES}분마다 강화할 수 있어요`;
const HAMMOCK_COOLING_DOWN = `해먹은 ${HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES}분마다 넓힐 수 있어요`;
const HAMMOCK_AT_MAX_LEVEL = '오늘은 해먹을 최대로 넓혔어요';
/** 창고 화면에 보여줄 최근 이력 수 */
const RECENT_LEDGER_LIMIT = 30;

export interface RodEnhancement {
  rodLevel: number;
  rodSpeedBonusPercent: number;
}

/** 정산이 끝난 상태를 받아 바꾼다. 바꿀 수 없으면 ConflictException 을 던진다 */
type HammockChange = (settled: HammockState, today: string, row: FishingState) => HammockState;

interface HammockChangeResult {
  row: FishingState;
  next: HammockState;
}

// 비즈니스 로직 계층 (docs/design/fishing.md)
// 수량은 항상 서버 시각으로 정산한다. 클라이언트가 보낸 수량은 받지 않는다.
@Injectable()
export class FishingService {
  constructor(
    private readonly fishingRepository: FishingRepository,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  /** 지금 해먹 상태. 계산만 하고 저장하지 않는다 */
  async getStatus(userId: string): Promise<FishingStatusResponse> {
    await this.usersService.findById(userId);
    const now = new Date();
    const row = await this.fishingRepository.findOrCreate(userId, now);
    const hammock = settleHammock(toHammockState(row), now);
    return buildFishingStatus(hammock, row, now);
  }

  /** 창고 화면: 창고 수량, 오늘·이번 달(KST) 저장량, 최근 이력. 조회만 한다 */
  async getWarehouse(userId: string): Promise<WarehouseResponse> {
    await this.usersService.findById(userId);
    const now = new Date();
    const row = await this.fishingRepository.findOrCreate(userId, now);
    const [stored, entries] = await Promise.all([
      this.fishingRepository.sumStoredFish(
        userId,
        kstDayStart(toKstDateString(now)),
        kstMonthStart(now),
      ),
      this.fishingRepository.findRecentLedger(userId, RECENT_LEDGER_LIMIT),
    ]);
    return {
      serverTime: now.toISOString(),
      warehouseFish: row.warehouseNanoFish / NANO_PER_FISH,
      todayStoredFish: stored.today / NANO_PER_FISH,
      monthStoredFish: stored.month / NANO_PER_FISH,
      recentEntries: entries.map(({ id, type, amountNanoFish, createdAt }) => ({
        id,
        type,
        amount: amountNanoFish / NANO_PER_FISH,
        createdAt: createdAt.toISOString(),
      })),
    };
  }

  /** 해먹의 물고기를 소수까지 모두 창고로 옮긴다 */
  async storeFish(userId: string): Promise<StoreFishResponse> {
    await this.usersService.findById(userId);
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const row = await this.fishingRepository.lockOrCreate(manager, userId, now);
      const { state, takenNanoFish } = takeAllFish(settleHammock(toHammockState(row), now));
      if (takenNanoFish <= 0) throw new ConflictException(NOTHING_TO_STORE);

      const warehouseNanoFish = row.warehouseNanoFish + takenNanoFish;
      await this.fishingRepository.updateState(manager, row.id, {
        ...toStateChanges(state),
        warehouseNanoFish,
      });
      await this.fishingRepository.addLedgerEntry(manager, {
        userId,
        type: 'STORE',
        amountNanoFish: takenNanoFish,
      });
      return {
        storedFish: takenNanoFish / NANO_PER_FISH,
        warehouseFish: warehouseNanoFish / NANO_PER_FISH,
        hammockFish: state.nanoFish / NANO_PER_FISH,
      };
    });
  }

  /**
   * 홈 '광고 보고 낚싯대 강화'. 클라이언트가 보상형 광고의 `userEarnedReward` 를 받은 뒤에만 호출한다.
   * 쿨타임(AD_ROD_POLICY.COOLDOWN_MINUTES) 안이면 409 (하루 최대 단계는 없다). 행 잠금으로 연타에도 한 번만 반영된다.
   */
  async adEnhanceRod(userId: string): Promise<FishingAdBoostResponse> {
    await this.usersService.findById(userId);
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const { row, next } = await this.changeHammock(
        manager,
        userId,
        now,
        (settled, today, current) => {
          if (isCoolingDown(current.adRodEnhancedAt, AD_ROD_POLICY.COOLDOWN_MINUTES, now)) {
            throw new ConflictException(AD_ROD_COOLING_DOWN);
          }
          return enhanceRod(settled, AD_ROD_POLICY.LEVELS_PER_AD, today);
        },
        { adRodEnhancedAt: now },
      );
      return buildFishingStatus(next, { ...row, adRodEnhancedAt: now }, now);
    });
  }

  /**
   * 홈 '광고 보고 해먹 넓히기'. `userEarnedReward` 뒤에만 호출한다.
   * 쿨타임(HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES)마다 정해진 순서로 한 단계씩 넓히고, 낚싯대도 함께 강화한다.
   * 쿨타임 안이거나 최대 단계면 409.
   */
  async adExpandHammock(userId: string): Promise<FishingAdBoostResponse> {
    await this.usersService.findById(userId);
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const { row, next } = await this.changeHammock(
        manager,
        userId,
        now,
        (settled, today, current) => {
          if (
            isCoolingDown(current.adHammockExpandedAt, HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES, now)
          ) {
            throw new ConflictException(HAMMOCK_COOLING_DOWN);
          }
          if (boostsOn(settled, today).hammockLevel >= HAMMOCK_EXPAND_POLICY.MAX_LEVEL) {
            throw new ConflictException(HAMMOCK_AT_MAX_LEVEL);
          }
          const expanded = expandHammock(settled, HAMMOCK_EXPAND_POLICY.LEVELS_PER_AD, today);
          return enhanceRod(expanded, HAMMOCK_EXPAND_POLICY.ROD_LEVELS_PER_EXPAND, today);
        },
        { adHammockExpandedAt: now },
      );
      return buildFishingStatus(next, { ...row, adHammockExpandedAt: now }, now);
    });
  }

  /**
   * `now` 가 속한 날 낚싯대를 강화한다. 호출하는 쪽(퀴즈·출석)의 트랜잭션 안에서 실행한다.
   * 호출하는 쪽이 보상 기록에 쓴 시각을 그대로 넘겨야 자정 직전 요청도 같은 날에 적용된다.
   */
  async enhanceRod(
    userId: string,
    levels: number,
    manager: EntityManager,
    now: Date,
  ): Promise<RodEnhancement> {
    const { next } = await this.changeHammock(manager, userId, now, (settled, today) =>
      enhanceRod(settled, levels, today),
    );
    return { rodLevel: next.rodLevel, rodSpeedBonusPercent: rodSpeedBonusPercent(next.rodLevel) };
  }

  /**
   * `now` 가 속한 날 자정까지 해달 친구가 한 명 더 함께 낚시한다 (하루 최대 인원에서 멈춤).
   * 호출하는 쪽(출석)의 트랜잭션 안에서 실행한다.
   */
  async summonOtterFriend(userId: string, manager: EntityManager, now: Date): Promise<void> {
    await this.changeHammock(manager, userId, now, summonOtterFriend);
  }

  /**
   * `now` 가 속한 날 자정까지 룰렛 미끼 효과(낚시 속도 +speedBonusPercent%)를 적용한다.
   * 호출하는 쪽(룰렛)의 트랜잭션 안에서 실행한다.
   */
  async applyBait(
    userId: string,
    speedBonusPercent: number,
    manager: EntityManager,
    now: Date,
  ): Promise<void> {
    await this.changeHammock(manager, userId, now, (settled, today) =>
      applyBait(settled, speedBonusPercent, today),
    );
  }

  /** 속도·용량을 바꾸기 전에 반드시 지금까지 잡은 물고기를 먼저 정산한다 */
  private async changeHammock(
    manager: EntityManager,
    userId: string,
    now: Date,
    change: HammockChange,
    extraChanges: FishingStateChanges = {},
  ): Promise<HammockChangeResult> {
    const row = await this.fishingRepository.lockOrCreate(manager, userId, now);
    // 서버 간 시계 차이로 마지막 정산 시각이 now 보다 늦으면 그 시각 기준으로 처리한다.
    // (정산을 건너뛴 채 이전 날짜로 보너스를 덮어써 다음 날 보너스를 잃는 것을 막는다)
    const at = row.settledAt > now ? row.settledAt : now;
    const next = change(settleHammock(toHammockState(row), at), toKstDateString(at), row);
    await this.fishingRepository.updateState(manager, row.id, {
      ...toStateChanges(next),
      ...extraChanges,
    });
    return { row, next };
  }
}
