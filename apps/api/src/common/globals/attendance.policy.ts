// 출석체크 보상 정책값 (docs/design/attendance-check.md). 값만 둔다. 계산은 modules/attendance/lib 에 둔다.
// 출석은 보상형 광고를 끝까지 본 뒤에 기록하고, 보상은 누적 출석 일차로 정한다 (연속이 아니어도 된다).
// 해달 친구(화면에서는 눈사람 친구)는 7일마다 온다 (7, 14, 21 … 일차. docs/design/snowman-friend.md).
export const ATTENDANCE_POLICY = {
  /** 1일차부터 이 일차까지 토스 포인트를 준다 */
  TOSS_POINT_LAST_DAY: 6,
  /** 하루에 주는 토스 포인트 (원) */
  TOSS_POINTS_PER_DAY: 1,
  /** 해달 친구가 오는 주기 (일). 이 수의 배수 일차마다 온다 (24시간, OTTER_FRIEND_POLICY) */
  OTTER_FRIEND_CYCLE_DAYS: 7,
  /** 첫 주가 지난 뒤, 해달 친구가 오지 않는 날마다 주는 낚싯대 강화 단계 (단계당 +1%, 그날 자정까지) */
  ROD_LEVELS_AFTER_FIRST_WEEK: 10,
} as const;
