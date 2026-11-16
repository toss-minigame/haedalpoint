import { ATTENDANCE_POLICY } from '../../../common/globals/index.js';
import { FIRST_WEEK, FIRST_WEEK_DAYS, rewardForDay } from '../lib/attendance-reward.policy.js';

describe('rewardForDay', () => {
  it.each([1, 2, 3, 4, 5, 6])('gives 1 toss point on day %i', (day) => {
    expect(rewardForDay(day)).toEqual({ type: 'TOSS_POINT', amount: 1 });
  });

  it('brings the otter friend on day 7', () => {
    expect(rewardForDay(7)).toEqual({ type: 'OTTER_FRIEND', amount: 1 });
  });

  it.each([8, 9, 30, 365])('enhances the rod by 10 levels on day %i', (day) => {
    expect(rewardForDay(day)).toEqual({ type: 'ENHANCE_BONUS', amount: 10 });
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects an invalid day %p', (day) => {
    expect(() => rewardForDay(day)).toThrow(RangeError);
  });

  it('returns a new object each time', () => {
    const first = rewardForDay(1);
    expect(rewardForDay(1)).not.toBe(first);
  });
});

describe('first week', () => {
  it('has the seven days up to the otter friend', () => {
    expect(FIRST_WEEK_DAYS).toBe(ATTENDANCE_POLICY.OTTER_FRIEND_DAY);
    expect(FIRST_WEEK).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
