import type { FishingStatusResponse } from '@haedalpoint/shared';
import { AD_ROD_POLICY, HAMMOCK_EXPAND_POLICY } from '../../../common/globals/index.js';
import { nextKstMidnight, toKstDateString } from '../../../common/utils/kst-date.js';
import type { FishingState } from '../entities/fishing-state.entity.js';
import type { FishingStateChanges } from '../fishing.repository.js';
import {
  fishPerHour,
  hammockCapacityNanoFish,
  hammockLevelBonusPercent,
  NANO_PER_FISH,
  rodSpeedBonusPercent,
  speedPercent,
} from './fishing-rate.js';
import { boostsOn, type HammockState, predictHammockFullAt } from './settle-hammock.js';

type FishingStateRow = Pick<
  FishingState,
  | 'hammockNanoFish'
  | 'settledAt'
  | 'rodLevel'
  | 'rodLevelDate'
  | 'otterFriendDate'
  | 'otterFriendCount'
  | 'hammockLevel'
  | 'hammockLevelDate'
  | 'baitBonusPercent'
  | 'baitDate'
>;

/** 현황 응답에 필요한, 해먹 계산 밖의 값 */
export type FishingAccount = Pick<
  FishingState,
  'warehouseNanoFish' | 'adRodEnhancedAt' | 'adHammockExpandedAt'
>;

const MINUTE_MS = 60 * 1000;

export function toHammockState(row: FishingStateRow): HammockState {
  return {
    nanoFish: row.hammockNanoFish,
    settledAt: row.settledAt,
    rodLevel: row.rodLevel,
    rodLevelDate: row.rodLevelDate,
    otterFriendDate: row.otterFriendDate,
    otterFriendCount: row.otterFriendCount,
    hammockLevel: row.hammockLevel,
    hammockLevelDate: row.hammockLevelDate,
    baitBonusPercent: row.baitBonusPercent,
    baitDate: row.baitDate,
  };
}

export function toStateChanges(state: HammockState): FishingStateChanges {
  return {
    hammockNanoFish: state.nanoFish,
    settledAt: state.settledAt,
    rodLevel: state.rodLevel,
    rodLevelDate: state.rodLevelDate,
    otterFriendDate: state.otterFriendDate,
    otterFriendCount: state.otterFriendCount,
    hammockLevel: state.hammockLevel,
    hammockLevelDate: state.hammockLevelDate,
    baitBonusPercent: state.baitBonusPercent,
    baitDate: state.baitDate,
  };
}

/** 마지막 광고 보상 시각에서 쿨타임이 끝나는 시각. 한 번도 안 받았으면 null */
export function cooldownEndsAt(lastAt: Date | null, cooldownMinutes: number): Date | null {
  if (!lastAt) return null;
  return new Date(lastAt.getTime() + cooldownMinutes * MINUTE_MS);
}

/** 아직 쿨타임 중인지 */
export function isCoolingDown(lastAt: Date | null, cooldownMinutes: number, now: Date): boolean {
  const endsAt = cooldownEndsAt(lastAt, cooldownMinutes);
  return endsAt !== null && endsAt > now;
}

/** 쿨타임 중이면 끝나는 시각(ISO 8601), 지금 받을 수 있으면 null */
function availableAtOrNull(lastAt: Date | null, cooldownMinutes: number, now: Date): string | null {
  const endsAt = cooldownEndsAt(lastAt, cooldownMinutes);
  return endsAt && endsAt > now ? endsAt.toISOString() : null;
}

/** `now` 로 정산된 해먹 상태를 화면용 응답으로 만든다 */
export function buildFishingStatus(
  hammock: HammockState,
  account: FishingAccount,
  now: Date,
): FishingStatusResponse {
  const boosts = boostsOn(hammock, toKstDateString(now));
  const percent = speedPercent(boosts);
  const fullAt = predictHammockFullAt(hammock);

  return {
    serverTime: now.toISOString(),
    hammockFish: hammock.nanoFish / NANO_PER_FISH,
    hammockCapacity: hammockCapacityNanoFish(boosts) / NANO_PER_FISH,
    hammockFullAt: fullAt ? fullAt.toISOString() : null,
    fishPerHour: fishPerHour(percent),
    speedPercent: percent,
    rodLevel: boosts.rodLevel,
    rodMaxLevel: null,
    rodSpeedBonusPercent: rodSpeedBonusPercent(boosts.rodLevel),
    otterFriendActive: boosts.otterFriends > 0,
    otterFriendCount: boosts.otterFriends,
    hammockLevel: boosts.hammockLevel,
    hammockMaxLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL,
    hammockLevelBonusPercent: hammockLevelBonusPercent(boosts.hammockLevel),
    adRodSpeedBonusPercent: rodSpeedBonusPercent(AD_ROD_POLICY.LEVELS_PER_AD),
    adRodEnhanceAvailableAt: availableAtOrNull(
      account.adRodEnhancedAt,
      AD_ROD_POLICY.COOLDOWN_MINUTES,
      now,
    ),
    adHammockBonusPercent: hammockLevelBonusPercent(HAMMOCK_EXPAND_POLICY.LEVELS_PER_AD),
    adHammockRodSpeedBonusPercent: rodSpeedBonusPercent(
      HAMMOCK_EXPAND_POLICY.ROD_LEVELS_PER_EXPAND,
    ),
    baitSpeedBonusPercent: boosts.baitBonusPercent,
    adHammockExpandAvailableAt: availableAtOrNull(
      account.adHammockExpandedAt,
      HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES,
      now,
    ),
    boostsResetAt: nextKstMidnight(now).toISOString(),
    warehouseFish: account.warehouseNanoFish / NANO_PER_FISH,
  };
}
