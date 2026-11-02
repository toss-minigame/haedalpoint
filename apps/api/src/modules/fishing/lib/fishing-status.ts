import type { FishingStatusResponse } from '@haedalpoint/shared';
import { ROD_POLICY } from '../../../common/globals/index.js';
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
  'hammockMilliFish' | 'settledAt' | 'rodLevel' | 'rodLevelDate' | 'otterFriendDate'
>;

export function toHammockState(row: FishingStateRow): HammockState {
  return {
    milliFish: row.hammockMilliFish,
    settledAt: row.settledAt,
    rodLevel: row.rodLevel,
    rodLevelDate: row.rodLevelDate,
    otterFriendDate: row.otterFriendDate,
  };
}

export function toStateChanges(state: HammockState): FishingStateChanges {
  return {
    hammockMilliFish: state.milliFish,
    settledAt: state.settledAt,
    rodLevel: state.rodLevel,
    rodLevelDate: state.rodLevelDate,
    otterFriendDate: state.otterFriendDate,
  };
}

/** `now` 로 정산된 해먹 상태를 화면용 응답으로 만든다 */
export function buildFishingStatus(
  hammock: HammockState,
  warehouseFish: number,
  now: Date,
): FishingStatusResponse {
  const boosts = boostsOn(hammock, toKstDateString(now));
  const percent = speedPercent(boosts);
  const fullAt = predictHammockFullAt(hammock);

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
    otterFriendActive: boosts.otterFriend,
    boostsResetAt: nextKstMidnight(now).toISOString(),
    warehouseFish,
  };
}
