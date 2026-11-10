// 제철 미끼 룰렛 운영 정책값 (docs/design/bait-roulette.md)
// ⚠️ 랜덤 보상이라 앱인토스 정책 확인 전이다 (비게임 랜덤 보상 허용 범위 문의 중). 확인 전에는 출시하지 않는다.
// 하루(KST) 한 번만 돌릴 수 있고(roulette_spins 유니크 제약), 결과는 광고를 본 뒤에만 그날 자정까지 적용된다.
// 값만 둔다. 뽑기 계산은 modules/roulette/lib 에 둔다.

/** 미끼 등급. 그달의 생선 4종이 이 순서대로 등급을 받는다 (weight 합 = 100 이라 weight 가 곧 확률 %) */
export const BAIT_TIERS = [
  { speedBonusPercent: 1, weight: 40 },
  { speedBonusPercent: 2, weight: 30 },
  { speedBonusPercent: 3, weight: 20 },
  { speedBonusPercent: 5, weight: 10 },
] as const;

export interface SeasonalFish {
  /** DB 에 저장하는 코드. 한 번 쓴 코드는 바꾸지 않는다 */
  code: string;
  name: string;
}

/**
 * 월별(KST) 제철 생선 4종. 배열 순서가 BAIT_TIERS 순서와 같다 (첫 생선 1%, 마지막 생선 5%).
 * ⚠️ 가안: 11~1월·5월만 기사로 확인했고 나머지 달은 기획 확인이 필요하다.
 */
export const SEASONAL_FISH_BY_MONTH: Readonly<Record<number, readonly SeasonalFish[]>> = {
  1: [
    { code: 'pollock', name: '명태' },
    { code: 'cod', name: '대구' },
    { code: 'spanish_mackerel', name: '삼치' },
    { code: 'yellowtail', name: '방어' },
  ],
  2: [
    { code: 'monkfish', name: '아귀' },
    { code: 'mullet', name: '숭어' },
    { code: 'cod', name: '대구' },
    { code: 'red_seabream', name: '참돔' },
  ],
  3: [
    { code: 'mullet', name: '숭어' },
    { code: 'rockfish', name: '볼락' },
    { code: 'marbled_flounder', name: '도다리' },
    { code: 'red_seabream', name: '참돔' },
  ],
  4: [
    { code: 'yellow_croaker', name: '조기' },
    { code: 'rockfish', name: '볼락' },
    { code: 'marbled_flounder', name: '도다리' },
    { code: 'red_seabream', name: '참돔' },
  ],
  5: [
    { code: 'conger_eel', name: '붕장어' },
    { code: 'pomfret', name: '병어' },
    { code: 'red_seabream', name: '참돔' },
    { code: 'olive_flounder', name: '광어' },
  ],
  6: [
    { code: 'damselfish', name: '자리돔' },
    { code: 'pomfret', name: '병어' },
    { code: 'sea_bass', name: '농어' },
    { code: 'croaker', name: '민어' },
  ],
  7: [
    { code: 'hairtail', name: '갈치' },
    { code: 'sea_bass', name: '농어' },
    { code: 'eel', name: '장어' },
    { code: 'croaker', name: '민어' },
  ],
  8: [
    { code: 'horse_mackerel', name: '전갱이' },
    { code: 'hairtail', name: '갈치' },
    { code: 'eel', name: '장어' },
    { code: 'croaker', name: '민어' },
  ],
  9: [
    { code: 'mackerel', name: '고등어' },
    { code: 'saury', name: '꽁치' },
    { code: 'hairtail', name: '갈치' },
    { code: 'gizzard_shad', name: '전어' },
  ],
  10: [
    { code: 'saury', name: '꽁치' },
    { code: 'mackerel', name: '고등어' },
    { code: 'spanish_mackerel', name: '삼치' },
    { code: 'gizzard_shad', name: '전어' },
  ],
  11: [
    { code: 'saury', name: '꽁치' },
    { code: 'mullet', name: '숭어' },
    { code: 'hairtail', name: '갈치' },
    { code: 'yellowtail', name: '방어' },
  ],
  12: [
    { code: 'sandfish', name: '도루묵' },
    { code: 'pollock', name: '명태' },
    { code: 'cod', name: '대구' },
    { code: 'yellowtail', name: '방어' },
  ],
};
