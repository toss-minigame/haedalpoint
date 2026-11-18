// 출석체크 API 응답 타입 (FE/BE 공용)
//
// 출석은 보상형(RV) 광고를 끝까지 본 뒤에 기록한다. 보상은 누적 출석 일차로 정한다 (연속이 아니어도 된다).
// - 1~6일차: 토스 포인트 1원 (프로모션 API 로 서버가 지급)
// - 7의 배수 일차 (7, 14, 21 …): 해달 친구 (24시간 함께 낚시. 화면에서는 눈사람 친구)
// - 그 밖의 8일차부터: 낚싯대 강화 (그날 자정까지)

/** TOSS_POINT: 토스 포인트(원), OTTER_FRIEND: 해달 친구(명), ENHANCE_BONUS: 낚싯대 강화(단계) */
export type AttendanceRewardType = 'TOSS_POINT' | 'OTTER_FRIEND' | 'ENHANCE_BONUS';

export interface AttendanceReward {
  type: AttendanceRewardType;
  amount: number;
}

/** 첫 주 출석 일차 */
export type AttendanceWeekDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface AttendanceWeekStamp {
  day: AttendanceWeekDay;
  checked: boolean;
  checkedDate: string | null;
  reward: AttendanceReward;
}

/** 토스 포인트 지급 상태. PENDING: 지급 중(서버가 다시 시도), SUCCESS: 지급 완료, FAILED: 지급 실패(문의 필요) */
export type TossPointGrantStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

// POST /api/attendance/check-in
// 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다.
export interface CheckInResponse {
  checkedDate: string; // 'YYYY-MM-DD' (KST)
  /** 누적 출석 일차 (1부터) */
  attendanceDay: number;
  reward: AttendanceReward;
  /** reward 가 TOSS_POINT 일 때 지급 상태. 그 밖에는 null */
  tossPointGrant: TossPointGrantStatus | null;
}

// GET /api/attendance/me
export interface AttendanceStatusResponse {
  today: string; // 'YYYY-MM-DD' (KST)
  checkedToday: boolean;
  /** 누적 출석 일수 */
  attendanceDays: number;
  /** 첫 주(7일차)까지 출석을 마쳤는지 */
  firstWeekCompleted: boolean;
  /**
   * 해달 친구(눈사람) 주기의 며칠째인지 (0~6 = 누적 출석 일수 % 7).
   * 0 은 아직 출석 전이거나 친구가 온 날, 1~6 은 눈사람을 만드는 중인 단계다
   */
  friendCycleDay: number;
  /** 다음 출석에서 받을 보상 (오늘 출석했으면 내일 출석 보상) */
  nextReward: AttendanceReward;
  /** 첫 주 1~7일차 출석 도장 */
  firstWeek: AttendanceWeekStamp[];
  /**
   * 첫 주가 지난 뒤 7일 묶음(8~14일차, 15~21일차 …)의 칸별 보상. 묶음마다 같다
   * (앞의 6일은 낚싯대 강화, 7번째 날은 해달 친구)
   */
  repeatingWeek: AttendanceReward[];
  /** 아직 지급되지 않은 출석 토스 포인트 (원) */
  pendingTossPoints: number;
}
