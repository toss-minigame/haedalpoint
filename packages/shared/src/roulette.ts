// 제철 미끼 룰렛 API 응답 타입 (FE/BE 공용, docs/design/bait-roulette.md)
// 하루 한 번 룰렛을 돌려 그달 제철 생선 미끼 하나를 뽑고, 광고를 본 뒤 그날 자정까지 낚시 속도를 올린다.

/** 이달의 미끼 하나 */
export interface BaitRouletteFish {
  code: string;
  name: string;
  /** 적용하면 오르는 낚시 속도 (기본 속도 대비 %) */
  speedBonusPercent: number;
  /** 이 미끼가 나올 확률 (%) */
  probabilityPercent: number;
}

/** 오늘 룰렛 결과 */
export interface BaitRouletteSpin {
  fishCode: string;
  fishName: string;
  speedBonusPercent: number;
  spunAt: string; // ISO 8601
  /** 광고를 보고 적용한 시각. 아직 적용 전이면 null */
  appliedAt: string | null;
}

// GET /api/roulette/today
export interface BaitRouletteTodayResponse {
  date: string; // 'YYYY-MM-DD' (KST)
  month: number; // 1~12 (KST)
  /** 룰렛 칸 순서대로 */
  fishes: BaitRouletteFish[];
  /** 오늘 돌린 결과. 아직 안 돌렸으면 null */
  spin: BaitRouletteSpin | null;
  canSpin: boolean;
  /** 결과가 있고 아직 적용하지 않았으면 true (광고를 보고 적용할 수 있음) */
  canApply: boolean;
  /** 오늘 결과와 적용 효과가 사라지는 시각 = 다음 KST 자정 (ISO 8601) */
  resetAt: string;
}

// POST /api/roulette/spin
export type SpinBaitRouletteResponse = BaitRouletteSpin;

// POST /api/roulette/ad-apply
// 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다. 응답은 적용된 결과다.
export type ApplyBaitResponse = BaitRouletteSpin;
