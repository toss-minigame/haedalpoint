import { AttendanceRewardPolicy } from '../lib/attendance-reward.policy';

describe('AttendanceRewardPolicy', () => {
  describe('rewardFor', () => {
    it.each([
      [1, 'ENHANCE_BONUS', 1],
      [2, 'ENHANCE_BONUS', 2],
      [3, 'ENHANCE_BONUS', 3],
      [4, 'ENHANCE_BONUS', 4],
      [5, 'ENHANCE_BONUS', 5],
      [6, 'ENHANCE_BONUS', 6],
      [7, 'OTTER_FRIEND', 1],
    ] as const)('day %d → %s x%d', (day, type, amount) => {
      expect(AttendanceRewardPolicy.rewardFor(day)).toEqual({ type, amount });
    });

    it('returns a copy so callers cannot mutate the table', () => {
      const reward = AttendanceRewardPolicy.rewardFor(1);
      reward.amount = 999;
      expect(AttendanceRewardPolicy.rewardFor(1).amount).toBe(1);
    });
  });

  describe('isCycleCompleted', () => {
    it('is true only on day 7', () => {
      expect(AttendanceRewardPolicy.isCycleCompleted(6)).toBe(false);
      expect(AttendanceRewardPolicy.isCycleCompleted(7)).toBe(true);
    });
  });

  describe('streakDayOn', () => {
    const today = '2026-10-30';

    it('starts at 1 with no history', () => {
      expect(AttendanceRewardPolicy.streakDayOn(today, null)).toBe(1);
    });

    it('continues when last check-in was yesterday', () => {
      const last = { checkedDate: '2026-10-29', streakDay: 3, cycleCompleted: false };
      expect(AttendanceRewardPolicy.streakDayOn(today, last)).toBe(4);
    });

    it('resets when a day was missed', () => {
      const last = { checkedDate: '2026-10-28', streakDay: 3, cycleCompleted: false };
      expect(AttendanceRewardPolicy.streakDayOn(today, last)).toBe(1);
    });

    it('resets after a completed cycle', () => {
      const last = { checkedDate: '2026-10-29', streakDay: 7, cycleCompleted: true };
      expect(AttendanceRewardPolicy.streakDayOn(today, last)).toBe(1);
    });

    it('throws on corrupted data beyond the cycle length', () => {
      const last = { checkedDate: '2026-10-29', streakDay: 7, cycleCompleted: false };
      expect(() => AttendanceRewardPolicy.streakDayOn(today, last)).toThrow(RangeError);
    });
  });
});
