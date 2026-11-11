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
 * 월별(KST) 제철 생선 4종 (기획 확정 목록). 배열 순서가 BAIT_TIERS 순서와 같다 (첫 생선 1%, 마지막 생선 5%).
 */
export const SEASONAL_FISH_BY_MONTH: Readonly<Record<number, readonly SeasonalFish[]>> = {
  1: [
    { code: 'pollock', name: '명태' },
    { code: 'monkfish', name: '아귀' },
    { code: 'smelt', name: '빙어' },
    { code: 'trout', name: '송어' },
  ],
  2: [
    { code: 'spanish_mackerel', name: '삼치' },
    { code: 'cod', name: '대구' },
    { code: 'marbled_flounder', name: '도다리' },
    { code: 'mullet', name: '숭어' },
  ],
  3: [
    { code: 'atka_mackerel', name: '임연수어' },
    { code: 'yellow_croaker', name: '조기' },
    { code: 'righteye_flounder', name: '가자미' },
    { code: 'icefish', name: '뱅어' },
  ],
  4: [
    { code: 'red_seabream', name: '참돔' },
    { code: 'big_eyed_herring', name: '밴댕이' },
    { code: 'anchovy', name: '멸치' },
    { code: 'silchi', name: '실치' },
  ],
  5: [
    { code: 'pomfret', name: '병어' },
    { code: 'damselfish', name: '자리돔' },
    { code: 'olive_flounder', name: '광어' },
    { code: 'grenadier_anchovy', name: '웅어' },
  ],
  6: [
    { code: 'croaker', name: '민어' },
    { code: 'sea_bass', name: '농어' },
    { code: 'conger_eel', name: '붕장어' },
    { code: 'chicken_grunt', name: '벤자리' },
  ],
  7: [
    { code: 'hairtail', name: '갈치' },
    { code: 'horse_mackerel', name: '전갱이' },
    { code: 'tilefish', name: '옥돔' },
    { code: 'filefish', name: '쥐치' },
  ],
  8: [
    { code: 'greater_amberjack', name: '잿방어' },
    { code: 'sweetfish', name: '은어' },
    { code: 'mandarin_fish', name: '쏘가리' },
    { code: 'sevenband_grouper', name: '능성어' },
  ],
  9: [
    { code: 'gizzard_shad', name: '전어' },
    { code: 'mackerel', name: '고등어' },
    { code: 'salmon', name: '연어' },
    { code: 'greenling', name: '쥐노래미' },
  ],
  10: [
    { code: 'saury', name: '꽁치' },
    { code: 'rockfish', name: '볼락' },
    { code: 'loach', name: '미꾸라지' },
    { code: 'bluefin_tuna', name: '참다랑어' },
  ],
  11: [
    { code: 'yellowtail', name: '방어' },
    { code: 'sandfish', name: '도루묵' },
    { code: 'sand_lance', name: '양미리' },
    { code: 'pufferfish', name: '복어' },
  ],
  12: [
    { code: 'snailfish', name: '물메기' },
    { code: 'skate', name: '홍어' },
    { code: 'stingray', name: '가오리' },
    { code: 'herring', name: '청어' },
  ],
};
