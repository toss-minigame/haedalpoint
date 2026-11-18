import type { AttendanceStatusResponse, AttendanceWeekStamp } from '@haedalpoint/shared';
import {
  FIRST_WEEK,
  FIRST_WEEK_DAYS,
  friendCycleDay,
  rewardForDay,
} from './attendance-reward.policy.js';

export interface AttendanceLogSnapshot {
  checkedDate: string;
  attendanceDay: number;
}

export interface AttendanceStatusInput {
  today: string;
  /** 누적 출석 일수 */
  attendanceDays: number;
  /** 가장 최근 출석 날짜. 출석한 적이 없으면 null */
  latestCheckedDate: string | null;
  /** 첫 주(1~7일차) 출석 로그 */
  firstWeekLogs: readonly AttendanceLogSnapshot[];
  pendingTossPoints: number;
}

function buildFirstWeek(logs: readonly AttendanceLogSnapshot[]): AttendanceWeekStamp[] {
  const dateByDay = new Map(logs.map((log) => [log.attendanceDay, log.checkedDate]));
  return FIRST_WEEK.map((day) => {
    const checkedDate = dateByDay.get(day) ?? null;
    return { day, checked: checkedDate !== null, checkedDate, reward: rewardForDay(day) };
  });
}

/** GET /attendance/me 응답 조립 */
export function buildAttendanceStatus(input: AttendanceStatusInput): AttendanceStatusResponse {
  const { today, attendanceDays, latestCheckedDate, firstWeekLogs, pendingTossPoints } = input;
  return {
    today,
    checkedToday: latestCheckedDate === today,
    attendanceDays,
    firstWeekCompleted: attendanceDays >= FIRST_WEEK_DAYS,
    friendCycleDay: friendCycleDay(attendanceDays),
    // 오늘 출석했으면 다음 출석은 내일이고, 어느 쪽이든 다음 일차는 누적 일수 + 1 이다
    nextReward: rewardForDay(attendanceDays + 1),
    firstWeek: buildFirstWeek(firstWeekLogs),
    repeatingWeek: FIRST_WEEK.map((day) => rewardForDay(FIRST_WEEK_DAYS + day)),
    pendingTossPoints,
  };
}
