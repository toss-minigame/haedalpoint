import type {
  AttendanceCycleStamp,
  AttendanceStatusResponse,
  AttendanceStreakDay,
} from '@haedalpoint/shared';
import {
  ATTENDANCE_CYCLE_DAYS,
  AttendanceRewardPolicy,
  type LastAttendance,
} from './attendance-reward.policy';
import { addDays } from './kst-date';

export interface AttendanceLogSnapshot extends LastAttendance {
  adBonusClaimedAt: Date | null;
}

const CYCLE_DAYS = Array.from(
  { length: ATTENDANCE_CYCLE_DAYS },
  (_, i) => (i + 1) as AttendanceStreakDay,
);

/**
 * 오늘 기준으로 아직 이어지고 있는 사이클의 일차 (끊겼거나 새 사이클 시작 전이면 0)
 * - 오늘 출석: 오늘 일차 (7일차 달성 당일은 7 그대로 보여줌)
 * - 어제 출석 + 사이클 진행 중: 어제 일차
 */
function resolveCurrentStreakDay(today: string, latest: AttendanceLogSnapshot | undefined): number {
  if (!latest) return 0;
  if (latest.checkedDate === today) return latest.streakDay;
  const continuesFromYesterday =
    latest.checkedDate === addDays(today, -1) && !latest.cycleCompleted;
  return continuesFromYesterday ? latest.streakDay : 0;
}

/** 현재 사이클의 로그(최신순)를 7칸 스탬프로 변환. 연속 구간이 깨진 로그는 무시 */
function buildCycle(
  currentStreakDay: number,
  recentLogs: readonly AttendanceLogSnapshot[],
): AttendanceCycleStamp[] {
  const dateByDay = new Map<number, string>();
  for (const [i, log] of recentLogs.slice(0, currentStreakDay).entries()) {
    if (log.streakDay !== currentStreakDay - i) break;
    dateByDay.set(log.streakDay, log.checkedDate);
  }

  return CYCLE_DAYS.map((day) => {
    const checkedDate = dateByDay.get(day) ?? null;
    return { day, checked: checkedDate !== null, checkedDate };
  });
}

/** GET /attendance/me 응답 조립. `recentLogs` 는 checkedDate 내림차순 (최대 7건이면 충분) */
export function buildAttendanceStatus(
  today: string,
  recentLogs: readonly AttendanceLogSnapshot[],
): AttendanceStatusResponse {
  const latest: AttendanceLogSnapshot | undefined = recentLogs[0];
  const checkedToday = latest?.checkedDate === today;
  const currentStreakDay = resolveCurrentStreakDay(today, latest);

  // 오늘 이미 출석했다면 "다음 출석" 은 내일
  const nextCheckInDate = checkedToday ? addDays(today, 1) : today;
  const nextStreakDay = AttendanceRewardPolicy.streakDayOn(nextCheckInDate, latest ?? null);

  return {
    today,
    checkedToday,
    currentStreakDay,
    nextStreakDay,
    nextReward: AttendanceRewardPolicy.rewardFor(nextStreakDay),
    cycle: buildCycle(currentStreakDay, recentLogs),
    adBonusAvailable: checkedToday && latest?.adBonusClaimedAt === null,
  };
}
