import type { AttendanceReward, AttendanceWeekDay } from '@haedalpoint/shared';
import { ATTENDANCE_POLICY } from '../../../common/globals/index.js';

/** 첫 주 일수 (출석 도장 칸 수) */
export const FIRST_WEEK_DAYS = ATTENDANCE_POLICY.OTTER_FRIEND_DAY;

export const FIRST_WEEK: readonly AttendanceWeekDay[] = Array.from(
  { length: FIRST_WEEK_DAYS },
  (_, i) => (i + 1) as AttendanceWeekDay,
);

/**
 * 누적 출석 `day` 일차의 보상 (docs/design/attendance-check.md).
 * 1~6일차 토스 포인트, 7일차 해달 친구, 8일차부터 낚싯대 강화.
 */
export function rewardForDay(day: number): AttendanceReward {
  if (!Number.isInteger(day) || day < 1) throw new RangeError(`Invalid attendance day: ${day}`);
  if (day <= ATTENDANCE_POLICY.TOSS_POINT_LAST_DAY) {
    return { type: 'TOSS_POINT', amount: ATTENDANCE_POLICY.TOSS_POINTS_PER_DAY };
  }
  if (day === ATTENDANCE_POLICY.OTTER_FRIEND_DAY) return { type: 'OTTER_FRIEND', amount: 1 };
  return { type: 'ENHANCE_BONUS', amount: ATTENDANCE_POLICY.ROD_LEVELS_AFTER_FIRST_WEEK };
}
