import { hammockTier } from './hammock-tier';

// 해먹 이름 (0단계 = 기본). 두 단계마다 해먹 종류가 바뀐다 (hammock-tier.ts). 단계 수·용량은 서버 정책값을 따른다
const BASE_NAME = '해먹';
const TIER_NAMES = ['그물 해먹', '나무 해먹', '대나무 해먹', '산호 해먹', '진주 해먹'];

/** 단계에 맞는 해먹 이름. 이름이 없는 높은 단계면 가장 높은 이름을 쓴다 */
export function hammockName(level: number): string {
  const tier = hammockTier(level, TIER_NAMES.length);
  return tier === 0 ? BASE_NAME : (TIER_NAMES[tier - 1] ?? BASE_NAME);
}
