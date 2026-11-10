import {
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';

// 낚시 속도·해먹 용량 계산 (순수 함수). 정책값은 common/globals/fishing.policy.ts 에만 둔다.
// 수량은 소수점을 버리지 않도록 1/10억 마리(nano-fish) 정수로 다룬다.
// 화면은 소수 7자리까지 보여주므로 정산마다 버리는 1 nano-fish 미만은 화면에 드러나지 않는다.

export const NANO_PER_FISH = 1_000_000_000;
const BASE_PERCENT = 100;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 그 시점에 적용되는 보너스 */
export interface Boosts {
  rodLevel: number;
  /** 함께 낚시하는 해달 친구 수 */
  otterFriends: number;
  /** 광고로 넓힌 해먹 단계 */
  hammockLevel: number;
}

export const NO_BOOSTS: Readonly<Boosts> = { rodLevel: 0, otterFriends: 0, hammockLevel: 0 };

/** 기본 해먹 용량 (nano-fish). 용량이 소수라 곱셈 오차를 반올림으로 없앤다 */
const BASE_CAPACITY_NANO_FISH = Math.round(FISHING_POLICY.HAMMOCK_CAPACITY * NANO_PER_FISH);

/** 강화 0단계·해달 친구 없이 1ms 동안 잡는 nano-fish */
const BASE_NANO_FISH_PER_MS =
  (FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS * FISHING_POLICY.FISH_PER_TOSS_POINT * NANO_PER_FISH) /
  (FISHING_POLICY.BASE_MONTH_DAYS * DAY_MS);

/** 낚싯대 강화로 오르는 속도 (기본 속도 대비 %) */
export function rodSpeedBonusPercent(rodLevel: number): number {
  return rodLevel * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL;
}

/** 기본 속도 대비 속도 (%). 보너스는 더한다 (ADR-0007) */
export function speedPercent(boosts: Boosts): number {
  const friendBonus = boosts.otterFriends * OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT;
  return BASE_PERCENT + rodSpeedBonusPercent(boosts.rodLevel) + friendBonus;
}

/** 해먹 단계로 늘어나는 용량 (기본 용량 대비 %) */
export function hammockLevelBonusPercent(hammockLevel: number): number {
  return hammockLevel * HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT_PER_LEVEL;
}

/** 기본 용량 대비 해먹 용량 보너스는 더한다 (해달 친구 한 명당 + 해먹 단계) */
export function hammockCapacityNanoFish(boosts: Boosts): number {
  const friendBonus = boosts.otterFriends * OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT;
  const bonus = friendBonus + hammockLevelBonusPercent(boosts.hammockLevel);
  return Math.floor((BASE_CAPACITY_NANO_FISH * (BASE_PERCENT + bonus)) / BASE_PERCENT);
}

export function nanoFishPerMs(percent: number): number {
  return (BASE_NANO_FISH_PER_MS * percent) / BASE_PERCENT;
}

export function fishPerHour(percent: number): number {
  return (nanoFishPerMs(percent) * HOUR_MS) / NANO_PER_FISH;
}

/** 이 속도로 하루 종일 낚시하면 받는 토스 포인트 (예산 계산용) */
export function tossPointsPerDay(percent: number): number {
  return (nanoFishPerMs(percent) * DAY_MS) / NANO_PER_FISH / FISHING_POLICY.FISH_PER_TOSS_POINT;
}
