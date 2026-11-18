import { ATTENDANCE_POLICY } from '../../../common/globals/index.js';
import {
  FIRST_WEEK,
  FIRST_WEEK_DAYS,
  friendCycleDay,
  rewardForDay,
} from '../lib/attendance-reward.policy.js';

describe('rewardForDay', () => {
  it.each([1, 2, 3, 4, 5, 6])('gives 1 toss point on day %i', (day) => {
    expect(rewardForDay(day)).toEqual({ type: 'TOSS_POINT', amount: 1 });
  });

  it.each([7, 14, 21, 28, 364])('brings the otter friend on day %i (every 7 days)', (day) => {
    expect(rewardForDay(day)).toEqual({ type: 'OTTER_FRIEND', amount: 1 });
  });

  it.each([8, 9, 13, 15, 30, 365])('enhances the rod by 10 levels on day %i', (day) => {
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
    expect(FIRST_WEEK_DAYS).toBe(ATTENDANCE_POLICY.OTTER_FRIEND_CYCLE_DAYS);
    expect(FIRST_WEEK).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('friendCycleDay', () => {
  it.each([
    [0, 0],
    [1, 1],
    [6, 6],
    [7, 0],
    [8, 1],
    [13, 6],
    [14, 0],
  ])('after %i attendance days is day %i of the cycle', (days, cycleDay) => {
    expect(friendCycleDay(days)).toBe(cycleDay);
  });
});
