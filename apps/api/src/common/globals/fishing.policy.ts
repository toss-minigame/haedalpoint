// 해달 낚시 · 해먹 · 창고 운영 정책값 (ADR-0007, docs/design/fishing.md)
// ⚠️ 전환 비율(FISH_PER_TOSS_POINT)만 확정값이다. 나머지는 임시값이며 이 파일만 고치면 된다
//    (api 재배포만 필요, web 은 API 응답으로 값을 받음).
// 값만 둔다. 계산 로직은 modules/fishing/lib 에 둔다.
// 값을 바꾸면 fishing-budget.spec.ts 가 월 예산(MONTHLY_TOSS_POINT_BUDGET) 초과 여부를 검사한다.
export const FISHING_POLICY = {
  /** 토스 포인트 1원으로 바꾸는 데 필요한 물고기 수 (확정, 매월 콘솔 보고 대상) */
  FISH_PER_TOSS_POINT: 500,
  /** 강화 없이 BASE_MONTH_DAYS 동안 쉬지 않고 낚시하면 받는 토스 포인트 → 기본 속도를 정한다 */
  BASE_MONTHLY_TOSS_POINTS: 1000,
  BASE_MONTH_DAYS: 30,
  /** 해먹 용량 (마리). 가득 차면 더 잡지 않는다 */
  HAMMOCK_CAPACITY: 5_000,
  /** 사용자 1명이 한 달에 받을 수 있는 최대 토스 포인트. 코드로 강제하지 않고 테스트로 지킨다 */
  MONTHLY_TOSS_POINT_BUDGET: 5_000,
} as const;

// 낚싯대 강화: 매일 KST 자정에 0단계로 초기화된다
export const ROD_POLICY = {
  /** 강화 1단계당 오르는 속도 (기본 속도 대비 %, 복리 아님) */
  SPEED_BONUS_PERCENT_PER_LEVEL: 10,
  /** 하루 최대 강화 단계 */
  MAX_LEVEL: 10,
} as const;

// 해달 친구: 7일 연속 출석한 날 자정까지 함께 낚시한다
export const OTTER_FRIEND_POLICY = {
  /** 오르는 속도 (기본 속도 대비 %) */
  SPEED_BONUS_PERCENT: 100,
  /** 늘어나는 해먹 용량 (기본 용량 대비 %) */
  CAPACITY_BONUS_PERCENT: 50,
} as const;
