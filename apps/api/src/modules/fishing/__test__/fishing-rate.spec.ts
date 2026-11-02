import { FISHING_POLICY, OTTER_FRIEND_POLICY, ROD_POLICY } from '../../../common/globals/index.js';
import {
  fishPerHour,
  hammockCapacityMilliFish,
  milliFishPerMs,
  NO_BOOSTS,
  rodSpeedBonusPercent,
  speedPercent,
  tossPointsPerDay,
} from '../lib/fishing-rate.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe('speedPercent', () => {
  it('is 100% without boosts', () => {
    expect(speedPercent(NO_BOOSTS)).toBe(100);
  });

  it('adds 10% of the base speed per rod level (not compounding)', () => {
    expect(speedPercent({ rodLevel: 3, otterFriend: false })).toBe(
      100 + 3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
    );
  });

  it('adds the otter friend bonus on top of the rod bonus', () => {
    expect(speedPercent({ rodLevel: 3, otterFriend: true })).toBe(
      100 + 3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL + OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT,
    );
  });
});

describe('rodSpeedBonusPercent', () => {
  it('is the rod part of the speed bonus', () => {
    expect(rodSpeedBonusPercent(4)).toBe(4 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL);
  });
});

describe('hammockCapacityMilliFish', () => {
  it('is the base capacity without the otter friend', () => {
    expect(hammockCapacityMilliFish(NO_BOOSTS)).toBe(FISHING_POLICY.HAMMOCK_CAPACITY * 1000);
  });

  it('grows by the otter friend capacity bonus', () => {
    expect(hammockCapacityMilliFish({ rodLevel: 0, otterFriend: true })).toBe(
      (FISHING_POLICY.HAMMOCK_CAPACITY *
        1000 *
        (100 + OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT)) /
        100,
    );
  });

  it('is not changed by rod upgrades', () => {
    expect(hammockCapacityMilliFish({ rodLevel: 5, otterFriend: false })).toBe(
      hammockCapacityMilliFish(NO_BOOSTS),
    );
  });
});

describe('base speed', () => {
  it('earns BASE_MONTHLY_TOSS_POINTS over BASE_MONTH_DAYS at 100%', () => {
    const fishPerMonth = (milliFishPerMs(100) * FISHING_POLICY.BASE_MONTH_DAYS * DAY_MS) / 1000;

    expect(fishPerMonth / FISHING_POLICY.FISH_PER_TOSS_POINT).toBeCloseTo(
      FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS,
      6,
    );
  });

  it('scales linearly with the speed percent', () => {
    expect(milliFishPerMs(250)).toBeCloseTo(milliFishPerMs(100) * 2.5, 12);
  });

  it('reports fish per hour', () => {
    expect(fishPerHour(100)).toBeCloseTo((milliFishPerMs(100) * HOUR_MS) / 1000, 9);
  });

  it('reports toss points per day', () => {
    expect(tossPointsPerDay(100)).toBeCloseTo(
      FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS / FISHING_POLICY.BASE_MONTH_DAYS,
      9,
    );
  });
});
