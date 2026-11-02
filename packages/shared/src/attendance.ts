// 출석체크 API 응답 타입 (FE/BE 공용)

export type AttendanceRewardType = 'ENHANCE_BONUS' | 'OTTER_FRIEND';

export interface AttendanceReward {
  type: AttendanceRewardType;
  amount: number;
}

export type AttendanceStreakDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface AttendanceCycleStamp {
  day: AttendanceStreakDay;
  checked: boolean;
  checkedDate: string | null;
}

// POST /api/attendance/check-in
export interface CheckInResponse {
  checkedDate: string; // 'YYYY-MM-DD' (KST)
  streakDay: AttendanceStreakDay;
  reward: AttendanceReward;
  cycleCompleted: boolean;
}

// GET /api/attendance/me
export interface AttendanceStatusResponse {
  today: string; // 'YYYY-MM-DD' (KST)
  checkedToday: boolean;
  currentStreakDay: number; // 0~7, 끊겼으면 0
  nextStreakDay: AttendanceStreakDay;
  nextReward: AttendanceReward;
  cycle: AttendanceCycleStamp[];
  adBonusAvailable: boolean;
}
