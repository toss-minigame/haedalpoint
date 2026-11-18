import { buildAttendanceStatus } from '../lib/attendance-status.js';

const TODAY = '2026-10-30';

function logs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    attendanceDay: i + 1,
    checkedDate: `2026-10-${String(10 + i * 2).padStart(2, '0')}`,
  }));
}

describe('buildAttendanceStatus', () => {
  it('shows an empty first week and a toss point for a new user', () => {
    const status = buildAttendanceStatus({
      today: TODAY,
      attendanceDays: 0,
      latestCheckedDate: null,
      firstWeekLogs: [],
      pendingTossPoints: 0,
    });

    expect(status).toMatchObject({
      today: TODAY,
      checkedToday: false,
      attendanceDays: 0,
      firstWeekCompleted: false,
      friendCycleDay: 0,
      nextReward: { type: 'TOSS_POINT', amount: 1 },
      pendingTossPoints: 0,
    });
    expect(status.firstWeek).toHaveLength(7);
    expect(status.firstWeek.every((stamp) => !stamp.checked)).toBe(true);
    expect(status.firstWeek[6].reward).toEqual({ type: 'OTTER_FRIEND', amount: 1 });
  });

  it('stamps attended days even when they are not consecutive', () => {
    const status = buildAttendanceStatus({
      today: TODAY,
      attendanceDays: 3,
      latestCheckedDate: '2026-10-14',
      firstWeekLogs: logs(3),
      pendingTossPoints: 1,
    });

    expect(status.firstWeek.map((stamp) => stamp.checked)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(status.firstWeek[2].checkedDate).toBe('2026-10-14');
    expect(status.checkedToday).toBe(false);
    expect(status.nextReward).toEqual({ type: 'TOSS_POINT', amount: 1 });
    expect(status.pendingTossPoints).toBe(1);
  });

  it('shows the otter friend as the next reward after six days', () => {
    const status = buildAttendanceStatus({
      today: TODAY,
      attendanceDays: 6,
      latestCheckedDate: TODAY,
      firstWeekLogs: logs(6),
      pendingTossPoints: 0,
    });

    expect(status.checkedToday).toBe(true);
    expect(status.nextReward).toEqual({ type: 'OTTER_FRIEND', amount: 1 });
  });

  it('completes the first week on day 7 and moves on to rod upgrades', () => {
    const status = buildAttendanceStatus({
      today: TODAY,
      attendanceDays: 7,
      latestCheckedDate: TODAY,
      firstWeekLogs: logs(7),
      pendingTossPoints: 0,
    });

    expect(status.firstWeekCompleted).toBe(true);
    expect(status.friendCycleDay).toBe(0);
    expect(status.firstWeek.every((stamp) => stamp.checked)).toBe(true);
    expect(status.nextReward).toEqual({ type: 'ENHANCE_BONUS', amount: 10 });
  });

  it('builds the next friend day by day and brings it again every 7 days', () => {
    const status = buildAttendanceStatus({
      today: TODAY,
      attendanceDays: 13,
      latestCheckedDate: TODAY,
      firstWeekLogs: logs(7),
      pendingTossPoints: 0,
    });

    expect(status.friendCycleDay).toBe(6);
    expect(status.nextReward).toEqual({ type: 'OTTER_FRIEND', amount: 1 });
  });

  it('tells the rewards of every week after the first (six rod upgrades, then the friend)', () => {
    const status = buildAttendanceStatus({
      today: TODAY,
      attendanceDays: 0,
      latestCheckedDate: null,
      firstWeekLogs: [],
      pendingTossPoints: 0,
    });

    expect(status.repeatingWeek).toEqual([
      ...Array.from({ length: 6 }, () => ({ type: 'ENHANCE_BONUS', amount: 10 })),
      { type: 'OTTER_FRIEND', amount: 1 },
    ]);
  });
});
