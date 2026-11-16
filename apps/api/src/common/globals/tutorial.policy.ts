// 첫 방문 튜토리얼 보상 정책값 (docs/design/tutorial.md 2장).
// 값만 둔다. 보상을 주는 로직은 modules/tutorial 에 둔다.
// 모두 사용자당 한 번이고, 광고 없이 준다. 월 예산은 fishing-budget.spec.ts 가 함께 검사한다.
export const TUTORIAL_REWARD_POLICY = {
  /** 낚싯대 강화 체험으로 오르는 단계 (그날 자정까지) */
  ROD_LEVELS: 1,
  /** 연습 퀴즈로 오르는 낚싯대 단계 (그날 자정까지) */
  QUIZ_ROD_LEVELS: 1,
  /** 첫 선물로 해먹에 더 넣는 최대 물고기 (마리 = 토스 포인트 1원어치). 지금 해먹 용량까지만 채운다 */
  GIFT_MAX_FISH: 48_000,
} as const;
