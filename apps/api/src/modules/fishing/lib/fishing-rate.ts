import { FISHING_POLICY, OTTER_FRIEND_POLICY, ROD_POLICY } from '../../../common/globals/index.js';

// 낚시 속도·해먹 용량 계산 (순수 함수). 정책값은 common/globals/fishing.policy.ts 에만 둔다.
// 수량은 소수점을 버리지 않도록 1/1000마리(milli-fish) 정수로 다룬다.

export const MILLI_PER_FISH = 1000;
const BASE_PERCENT = 100;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** 그 시점에 적용되는 속도 보너스 */
export interface Boosts {
  rodLevel: number;
  otterFriend: boolean;
}

export const NO_BOOSTS: Readonly<Boosts> = { rodLevel: 0, otterFriend: false };

/** 강화 0단계·해달 친구 없이 1ms 동안 잡는 milli-fish */
const BASE_MILLI_FISH_PER_MS =
  (FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS * FISHING_POLICY.FISH_PER_TOSS_POINT * MILLI_PER_FISH) /
  (FISHING_POLICY.BASE_MONTH_DAYS * DAY_MS);

/** 낚싯대 강화로 오르는 속도 (기본 속도 대비 %) */
export function rodSpeedBonusPercent(rodLevel: number): number {
  return rodLevel * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL;
}

/** 기본 속도 대비 속도 (%). 보너스는 더한다 (ADR-0007) */
export function speedPercent(boosts: Boosts): number {
  const friendBonus = boosts.otterFriend ? OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT : 0;
  return BASE_PERCENT + rodSpeedBonusPercent(boosts.rodLevel) + friendBonus;
}

export function hammockCapacityMilliFish(boosts: Boosts): number {
  const bonus = boosts.otterFriend ? OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT : 0;
  return Math.floor(
    (FISHING_POLICY.HAMMOCK_CAPACITY * MILLI_PER_FISH * (BASE_PERCENT + bonus)) / BASE_PERCENT,
  );
}

export function milliFishPerMs(percent: number): number {
  return (BASE_MILLI_FISH_PER_MS * percent) / BASE_PERCENT;
}

export function fishPerHour(percent: number): number {
  return (milliFishPerMs(percent) * HOUR_MS) / MILLI_PER_FISH;
}

/** 이 속도로 하루 종일 낚시하면 받는 토스 포인트 (예산 계산용) */
export function tossPointsPerDay(percent: number): number {
  return (milliFishPerMs(percent) * DAY_MS) / MILLI_PER_FISH / FISHING_POLICY.FISH_PER_TOSS_POINT;
}
