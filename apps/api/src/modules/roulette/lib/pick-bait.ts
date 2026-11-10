import type { BaitRouletteFish } from '@haedalpoint/shared';
import { BAIT_TIERS, SEASONAL_FISH_BY_MONTH } from '../../../common/globals/index.js';

// 룰렛 뽑기 계산 (순수 함수). 난수는 호출하는 쪽에서 넣는다 (lib/roulette-roller.ts).

/** 등급 가중치 합. 0 이상 이 값 미만의 정수 하나로 뽑는다 */
export const TOTAL_BAIT_WEIGHT = BAIT_TIERS.reduce((sum, tier) => sum + tier.weight, 0);

/** 'YYYY-MM-DD' 의 월 (1~12) */
export function monthOf(date: string): number {
  return Number(date.slice('YYYY-'.length, 'YYYY-MM'.length));
}

/** 그달 룰렛 칸. 생선 순서대로 BAIT_TIERS 등급을 받는다 */
export function baitsOfMonth(month: number): BaitRouletteFish[] {
  const fishes = SEASONAL_FISH_BY_MONTH[month];
  if (!fishes || fishes.length !== BAIT_TIERS.length) {
    throw new Error(`${month}월 제철 생선은 ${BAIT_TIERS.length}종이어야 합니다`);
  }
  return fishes.map((fish, index) => ({
    code: fish.code,
    name: fish.name,
    speedBonusPercent: BAIT_TIERS[index].speedBonusPercent,
    probabilityPercent: (BAIT_TIERS[index].weight / TOTAL_BAIT_WEIGHT) * 100,
  }));
}

/** roll(0 이상 TOTAL_BAIT_WEIGHT 미만 정수)이 떨어지는 등급 칸 번호 */
export function pickBaitIndex(roll: number): number {
  if (!Number.isInteger(roll) || roll < 0 || roll >= TOTAL_BAIT_WEIGHT) {
    throw new RangeError(`roll 은 0 이상 ${TOTAL_BAIT_WEIGHT} 미만 정수여야 합니다: ${roll}`);
  }
  let upper = 0;
  for (const [index, tier] of BAIT_TIERS.entries()) {
    upper += tier.weight;
    if (roll < upper) return index;
  }
  throw new RangeError(`roll 이 등급 범위를 벗어났습니다: ${roll}`);
}
