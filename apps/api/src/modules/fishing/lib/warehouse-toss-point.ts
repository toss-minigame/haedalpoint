import { FISHING_POLICY, WAREHOUSE_TOSS_POINT_POLICY } from '../../../common/globals/index.js';
import { MILLI_PER_FISH } from './fishing-rate.js';

// 창고 물고기로 토스 포인트 받기 계산 (순수 함수, docs/design/warehouse-toss-point.md).
// 정책값은 common/globals/fishing.policy.ts 의 FISHING_POLICY·WAREHOUSE_TOSS_POINT_POLICY.

/** 토스 포인트 1원에 드는 물고기 (milli-fish) */
export const MILLI_FISH_PER_TOSS_POINT = FISHING_POLICY.FISH_PER_TOSS_POINT * MILLI_PER_FISH;

/** 물고기로 바꿀 수 있는 토스 포인트 (원, 1원 단위로 내림) */
export function tossPointsOf(milliFish: number): number {
  return Math.floor(milliFish / MILLI_FISH_PER_TOSS_POINT);
}

/** 지금 받을 수 있는 토스 포인트 (원): 창고 물고기로 바꿀 수 있는 만큼, 오늘 남은 한도 안에서 */
export function claimableTossPoints(
  warehouseMilliFish: number,
  todayClaimedPoints: number,
): number {
  const remaining = Math.max(0, WAREHOUSE_TOSS_POINT_POLICY.DAILY_LIMIT - todayClaimedPoints);
  return Math.min(tossPointsOf(warehouseMilliFish), remaining);
}
