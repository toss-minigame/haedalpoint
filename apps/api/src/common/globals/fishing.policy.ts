// 해달 낚시 · 해먹 · 창고 운영 정책값 (ADR-0007, docs/design/fishing.md)
// ⚠️ 전환 비율(FISH_PER_TOSS_POINT)만 확정값이다. 나머지는 임시값이며 이 파일만 고치면 된다
//    (api 재배포만 필요, web 은 API 응답으로 값을 받음).
// 값만 둔다. 계산 로직은 modules/fishing/lib 에 둔다.
// 값을 바꾸면 fishing-budget.spec.ts 가 월 예산(MONTHLY_TOSS_POINT_BUDGET) 초과 여부를 검사한다.
// 속도 값을 바꿔 배포하면 각 사용자의 마지막 정산 이후 시간도 새 속도로 계산된다 (해먹 용량 이내).
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

// 해달 친구: 7일 연속 출석한 날 자정까지 함께 낚시한다. 출석 '광고 보고 2배'로 한 명 더 온다
export const OTTER_FRIEND_POLICY = {
  /** 해달 친구 한 명당 오르는 속도 (기본 속도 대비 %) */
  SPEED_BONUS_PERCENT: 100,
  /** 해달 친구 한 명당 늘어나는 해먹 용량 (기본 용량 대비 %) */
  CAPACITY_BONUS_PERCENT: 50,
  /** 하루에 함께 낚시할 수 있는 해달 친구 수 (7일차 출석 1 + 광고 2배 1) */
  MAX_PER_DAY: 2,
} as const;

// 홈 '광고 보고 낚싯대 강화': 쿨타임마다 한 번. 하루 최대 단계는 ROD_POLICY.MAX_LEVEL 을 함께 쓴다
export const AD_ROD_POLICY = {
  /** 광고 1회당 오르는 강화 단계 */
  LEVELS_PER_AD: 1,
  /** 다음 광고 강화까지 기다리는 시간 (분) */
  COOLDOWN_MINUTES: 20,
} as const;

// 홈 '광고 보고 해먹 넓히기': 하루 1회, 그날 자정까지 용량이 늘어난다.
// 속도는 그대로라 월 예산 최악값(해먹을 한 번도 넘치지 않게 비우는 경우)에는 영향이 없다
export const HAMMOCK_EXPAND_POLICY = {
  /** 늘어나는 해먹 용량 (기본 용량 대비 %) */
  CAPACITY_BONUS_PERCENT: 50,
} as const;
