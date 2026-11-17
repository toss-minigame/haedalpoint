import type { AttendanceReward, AttendanceStamp, AttendanceStatus } from '@/entities/attendance';

const DAYS_PER_WEEK = 7;

/** 다음에 출석할 일차. 오늘 출석했으면 null */
export function nextAttendanceDay(status: AttendanceStatus): number | null {
  return status.checkedToday ? null : status.attendanceDays + 1;
}

/**
 * 오늘 출석해서 받은 보상. 오늘 아직 출석하지 않았으면 null.
 * 첫 주(1~7일차)는 서버가 준 그날 칸의 보상, 그 뒤로는 날마다 같은 보상(낚싯대 강화)이라 다음 출석 보상과 같다.
 */
export function todayReward(status: AttendanceStatus): AttendanceReward | null {
  if (!status.checkedToday) return null;
  const firstWeekStamp = status.firstWeek.find((stamp) => stamp.day === status.attendanceDays);
  return firstWeekStamp?.reward ?? status.nextReward;
}

/**
 * 지금 보여줄 7일 묶음 (1~7일차, 8~14일차 …). 첫 주는 서버가 준 칸(그날 보상 포함)을 그대로 쓰고,
 * 그 뒤 묶음은 누적 출석 일수로 체크하고 보상은 다음 출석 보상(낚싯대 강화)으로 채운다.
 * 오늘 출석했으면 오늘이 든 묶음, 아니면 다음에 출석할 날이 든 묶음을 보여준다.
 */
export function attendanceWeek(status: AttendanceStatus): AttendanceStamp[] {
  const focusDay = status.checkedToday ? status.attendanceDays : status.attendanceDays + 1;
  const weekIndex = Math.floor((Math.max(focusDay, 1) - 1) / DAYS_PER_WEEK);
  if (weekIndex === 0) return status.firstWeek;

  const firstDay = weekIndex * DAYS_PER_WEEK + 1;
  return Array.from({ length: DAYS_PER_WEEK }, (_, offset) => {
    const day = firstDay + offset;
    return { day, checked: day <= status.attendanceDays, reward: status.nextReward };
  });
}
