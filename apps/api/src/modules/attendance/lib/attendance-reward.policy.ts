import type { AttendanceReward, AttendanceWeekDay } from '@haedalpoint/shared';
import { ATTENDANCE_POLICY } from '../../../common/globals/index.js';

/** 첫 주 일수 (출석 도장 칸 수) */
export const FIRST_WEEK_DAYS = ATTENDANCE_POLICY.OTTER_FRIEND_CYCLE_DAYS;

export const FIRST_WEEK: readonly AttendanceWeekDay[] = Array.from(
  { length: FIRST_WEEK_DAYS },
  (_, i) => (i + 1) as AttendanceWeekDay,
);

/**
 * 누적 출석 `day` 일차의 보상 (docs/design/attendance-check.md).
 * 1~6일차 토스 포인트, 7의 배수 일차(7, 14, 21 …) 해달 친구, 그 밖의 8일차부터는 낚싯대 강화.
 */
export function rewardForDay(day: number): AttendanceReward {
  if (!Number.isInteger(day) || day < 1) throw new RangeError(`Invalid attendance day: ${day}`);
  if (day <= ATTENDANCE_POLICY.TOSS_POINT_LAST_DAY) {
    return { type: 'TOSS_POINT', amount: ATTENDANCE_POLICY.TOSS_POINTS_PER_DAY };
  }
  if (friendCycleDay(day) === 0) return { type: 'OTTER_FRIEND', amount: 1 };
  return { type: 'ENHANCE_BONUS', amount: ATTENDANCE_POLICY.ROD_LEVELS_AFTER_FIRST_WEEK };
}

/**
 * 누적 출석 `days` 일이 해달 친구 주기의 며칠째인지 (0 ~ 주기 − 1).
 * 0 은 아직 출석 전이거나 친구가 온 날이고, 1부터 친구(눈사람)를 하루씩 만들어 간다.
 */
export function friendCycleDay(days: number): number {
  return days % ATTENDANCE_POLICY.OTTER_FRIEND_CYCLE_DAYS;
}
