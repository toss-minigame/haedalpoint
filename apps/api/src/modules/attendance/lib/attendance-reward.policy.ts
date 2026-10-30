import type { AttendanceReward, AttendanceStreakDay } from '@haedalpoint/shared';
import { addDays } from './kst-date';

export const ATTENDANCE_CYCLE_DAYS = 7;

// 일차별 보상 테이블. 값은 임시 — 밸런스 조정 시 여기만 수정
const REWARD_BY_DAY: Readonly<Record<AttendanceStreakDay, AttendanceReward>> = {
  1: { type: 'ENHANCE_BONUS', amount: 1 },
  2: { type: 'ENHANCE_BONUS', amount: 2 },
  3: { type: 'ENHANCE_BONUS', amount: 3 },
  4: { type: 'ENHANCE_BONUS', amount: 4 },
  5: { type: 'ENHANCE_BONUS', amount: 5 },
  6: { type: 'ENHANCE_BONUS', amount: 6 },
  7: { type: 'OTTER_FRIEND', amount: 1 },
};

export interface LastAttendance {
  checkedDate: string;
  streakDay: number;
  cycleCompleted: boolean;
}

function toStreakDay(day: number): AttendanceStreakDay {
  if (!Number.isInteger(day) || day < 1 || day > ATTENDANCE_CYCLE_DAYS) {
    throw new RangeError(`Invalid streak day: ${day}`);
  }
  return day as AttendanceStreakDay;
}

export const AttendanceRewardPolicy = {
  rewardFor(day: AttendanceStreakDay): AttendanceReward {
    return { ...REWARD_BY_DAY[day] };
  },

  isCycleCompleted(day: AttendanceStreakDay): boolean {
    return day === ATTENDANCE_CYCLE_DAYS;
  },

  /** `date` 에 출석하면 받게 될 일차. 직전 출석이 전날이고 사이클 진행 중이면 +1, 아니면 1 */
  streakDayOn(date: string, last: LastAttendance | null): AttendanceStreakDay {
    const continues =
      last !== null && last.checkedDate === addDays(date, -1) && !last.cycleCompleted;
    return continues ? toStreakDay(last.streakDay + 1) : 1;
  },
};
