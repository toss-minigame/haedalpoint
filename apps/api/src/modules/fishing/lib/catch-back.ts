import { CATCH_BACK_POLICY } from '../../../common/globals/index.js';
import { NANO_PER_FISH } from './fishing-rate.js';

// 넘친 물고기 다시 잡아오기 계산 (순수 함수). 정책값은 common/globals/fishing.policy.ts 의 CATCH_BACK_POLICY.

const PERCENT = 100;
const MAX_NANO_FISH = Math.round(CATCH_BACK_POLICY.MAX_FISH * NANO_PER_FISH);
/** 이보다 적으면 다시 잡아오기를 권하지 않는다 (nano-fish) */
export const MIN_CATCH_BACK_NANO_FISH = Math.round(CATCH_BACK_POLICY.MIN_FISH * NANO_PER_FISH);

/**
 * 저장할 때 다시 잡아올 수 있는 양 (nano-fish).
 * 넘친 양의 RETURN_PERCENT, 광고 1회 상한 MAX_FISH, 지금 해먹 용량의 CAPACITY_PERCENT 중 가장 작은 값.
 */
export function catchBackNanoFish(overflowNanoFish: number, capacityNanoFish: number): number {
  return Math.floor(
    Math.min(
      (overflowNanoFish * CATCH_BACK_POLICY.RETURN_PERCENT) / PERCENT,
      MAX_NANO_FISH,
      (capacityNanoFish * CATCH_BACK_POLICY.CAPACITY_PERCENT) / PERCENT,
    ),
  );
}

/** `today`(KST)에 이미 다시 잡아온 횟수. 기록한 날짜가 다르면 0 */
export function catchBacksUsedOn(count: number, date: string | null, today: string): number {
  return date === today ? count : 0;
}
