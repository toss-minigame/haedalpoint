import { type AttendanceLogSnapshot, buildAttendanceStatus } from '../lib/attendance-status';

const TODAY = '2026-10-30';

function log(
  checkedDate: string,
  streakDay: number,
  overrides: Partial<AttendanceLogSnapshot> = {},
): AttendanceLogSnapshot {
  return {
    checkedDate,
    streakDay,
    cycleCompleted: streakDay === 7,
    adBonusClaimedAt: null,
    ...overrides,
  };
}

function checkedDays(status: ReturnType<typeof buildAttendanceStatus>): number[] {
  return status.cycle.filter((s) => s.checked).map((s) => s.day);
}

describe('buildAttendanceStatus', () => {
  it('returns an empty cycle for a first-time user', () => {
    const status = buildAttendanceStatus(TODAY, []);

    expect(status).toMatchObject({
      today: TODAY,
      checkedToday: false,
      currentStreakDay: 0,
      nextStreakDay: 1,
      nextReward: { type: 'ENHANCE_BONUS', amount: 1 },
      adBonusAvailable: false,
    });
    expect(status.cycle).toHaveLength(7);
    expect(checkedDays(status)).toEqual([]);
  });

  it('marks every stamp unchecked when the streak is broken', () => {
    const status = buildAttendanceStatus(TODAY, [log('2026-10-28', 2), log('2026-10-27', 1)]);

    expect(status.currentStreakDay).toBe(0);
    expect(status.nextStreakDay).toBe(1);
    expect(checkedDays(status)).toEqual([]);
  });

  it('shows the in-progress cycle when last check-in was yesterday', () => {
    const status = buildAttendanceStatus(TODAY, [
      log('2026-10-29', 3),
      log('2026-10-28', 2),
      log('2026-10-27', 1),
      log('2026-10-20', 5), // 이전 사이클 — 무시
    ]);

    expect(status.checkedToday).toBe(false);
    expect(status.currentStreakDay).toBe(3);
    expect(status.nextStreakDay).toBe(4);
    expect(status.nextReward).toEqual({ type: 'ENHANCE_BONUS', amount: 4 });
    expect(status.cycle.slice(0, 4)).toEqual([
      { day: 1, checked: true, checkedDate: '2026-10-27' },
      { day: 2, checked: true, checkedDate: '2026-10-28' },
      { day: 3, checked: true, checkedDate: '2026-10-29' },
      { day: 4, checked: false, checkedDate: null },
    ]);
  });

  it('includes today and points next reward to tomorrow after checking in', () => {
    const status = buildAttendanceStatus(TODAY, [log(TODAY, 2), log('2026-10-29', 1)]);

    expect(status.checkedToday).toBe(true);
    expect(status.currentStreakDay).toBe(2);
    expect(status.nextStreakDay).toBe(3);
    expect(checkedDays(status)).toEqual([1, 2]);
    expect(status.adBonusAvailable).toBe(true);
  });

  it('shows all 7 stamps on the day the cycle completes, then next is day 1', () => {
    // 10-30(7일차) ~ 10-24(1일차), 최신순
    const logs = [7, 6, 5, 4, 3, 2, 1].map((day, i) => log(`2026-10-${30 - i}`, day));
    const status = buildAttendanceStatus(TODAY, logs);

    expect(status.currentStreakDay).toBe(7);
    expect(checkedDays(status)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(status.nextStreakDay).toBe(1);
  });

  it('starts a fresh cycle the day after completion', () => {
    const status = buildAttendanceStatus(TODAY, [log('2026-10-29', 7)]);

    expect(status.currentStreakDay).toBe(0);
    expect(status.nextStreakDay).toBe(1);
    expect(checkedDays(status)).toEqual([]);
  });

  it('disables ad bonus once claimed', () => {
    const status = buildAttendanceStatus(TODAY, [log(TODAY, 1, { adBonusClaimedAt: new Date() })]);

    expect(status.adBonusAvailable).toBe(false);
  });

  it('ignores logs that break the consecutive run', () => {
    // 데이터가 어긋난 경우(수동 수정 등)에도 연속 구간만 스탬프로 표시
    const status = buildAttendanceStatus(TODAY, [log('2026-10-29', 3), log('2026-10-28', 1)]);

    expect(checkedDays(status)).toEqual([3]);
  });
});
