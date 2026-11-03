import type { FishingStatusResponse } from '@haedalpoint/shared';
import { AD_ROD_POLICY, HAMMOCK_EXPAND_POLICY, ROD_POLICY } from '../../../common/globals/index.js';
import { nextKstMidnight, toKstDateString } from '../../../common/utils/kst-date.js';
import type { FishingState } from '../entities/fishing-state.entity.js';
import type { FishingStateChanges } from '../fishing.repository.js';
import {
  fishPerHour,
  hammockCapacityMilliFish,
  MILLI_PER_FISH,
  rodSpeedBonusPercent,
  speedPercent,
} from './fishing-rate.js';
import { boostsOn, type HammockState, predictHammockFullAt } from './settle-hammock.js';

type FishingStateRow = Pick<
  FishingState,
  | 'hammockMilliFish'
  | 'settledAt'
  | 'rodLevel'
  | 'rodLevelDate'
  | 'otterFriendDate'
  | 'otterFriendCount'
  | 'hammockExpandedDate'
>;

const MINUTE_MS = 60 * 1000;

export function toHammockState(row: FishingStateRow): HammockState {
  return {
    milliFish: row.hammockMilliFish,
    settledAt: row.settledAt,
    rodLevel: row.rodLevel,
    rodLevelDate: row.rodLevelDate,
    otterFriendDate: row.otterFriendDate,
    otterFriendCount: row.otterFriendCount,
    hammockExpandedDate: row.hammockExpandedDate,
  };
}

export function toStateChanges(state: HammockState): FishingStateChanges {
  return {
    hammockMilliFish: state.milliFish,
    settledAt: state.settledAt,
    rodLevel: state.rodLevel,
    rodLevelDate: state.rodLevelDate,
    otterFriendDate: state.otterFriendDate,
    otterFriendCount: state.otterFriendCount,
    hammockExpandedDate: state.hammockExpandedDate,
  };
}

/** 광고 강화를 다시 할 수 있는 시각. 한 번도 안 했으면 null */
export function adRodEnhanceAvailableAt(adRodEnhancedAt: Date | null): Date | null {
  if (!adRodEnhancedAt) return null;
  return new Date(adRodEnhancedAt.getTime() + AD_ROD_POLICY.COOLDOWN_MINUTES * MINUTE_MS);
}

/** `now` 로 정산된 해먹 상태를 화면용 응답으로 만든다 */
export function buildFishingStatus(
  hammock: HammockState,
  warehouseFish: number,
  adRodEnhancedAt: Date | null,
  now: Date,
): FishingStatusResponse {
  const boosts = boostsOn(hammock, toKstDateString(now));
  const percent = speedPercent(boosts);
  const fullAt = predictHammockFullAt(hammock);
  const availableAt = adRodEnhanceAvailableAt(adRodEnhancedAt);

  return {
    serverTime: now.toISOString(),
    hammockFish: hammock.milliFish / MILLI_PER_FISH,
    hammockCapacity: hammockCapacityMilliFish(boosts) / MILLI_PER_FISH,
    hammockFullAt: fullAt ? fullAt.toISOString() : null,
    fishPerHour: fishPerHour(percent),
    speedPercent: percent,
    rodLevel: boosts.rodLevel,
    rodMaxLevel: ROD_POLICY.MAX_LEVEL,
    rodSpeedBonusPercent: rodSpeedBonusPercent(boosts.rodLevel),
    otterFriendActive: boosts.otterFriends > 0,
    otterFriendCount: boosts.otterFriends,
    hammockExpanded: boosts.hammockExpanded,
    hammockExpandBonusPercent: HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT,
    adRodSpeedBonusPercent: rodSpeedBonusPercent(AD_ROD_POLICY.LEVELS_PER_AD),
    adRodEnhanceAvailableAt: availableAt && availableAt > now ? availableAt.toISOString() : null,
    boostsResetAt: nextKstMidnight(now).toISOString(),
    warehouseFish,
  };
}
