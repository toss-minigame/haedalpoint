import {
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import {
  fishPerHour,
  hammockCapacityMilliFish,
  hammockLevelBonusPercent,
  milliFishPerMs,
  NO_BOOSTS,
  rodSpeedBonusPercent,
  speedPercent,
  tossPointsPerDay,
} from '../lib/fishing-rate.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BASE_CAPACITY = FISHING_POLICY.HAMMOCK_CAPACITY * 1000;

describe('speedPercent', () => {
  it('is 100% without boosts', () => {
    expect(speedPercent(NO_BOOSTS)).toBe(100);
  });

  it('adds 10% of the base speed per rod level (not compounding)', () => {
    expect(speedPercent({ ...NO_BOOSTS, rodLevel: 3 })).toBe(
      100 + 3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
    );
  });

  it('adds the otter friend bonus on top of the rod bonus', () => {
    expect(speedPercent({ ...NO_BOOSTS, rodLevel: 3, otterFriends: 1 })).toBe(
      100 + 3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL + OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT,
    );
  });

  it('adds the otter friend bonus once per friend', () => {
    expect(speedPercent({ ...NO_BOOSTS, otterFriends: 2 })).toBe(
      100 + 2 * OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT,
    );
  });

  it('is not changed by expanding the hammock', () => {
    expect(speedPercent({ ...NO_BOOSTS, hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL })).toBe(100);
  });
});

describe('hammockLevelBonusPercent', () => {
  it('adds the per-level bonus for each level, up to the max level', () => {
    const perLevel = HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT_PER_LEVEL;

    expect(hammockLevelBonusPercent(1)).toBe(perLevel);
    expect(hammockLevelBonusPercent(HAMMOCK_EXPAND_POLICY.MAX_LEVEL)).toBe(
      HAMMOCK_EXPAND_POLICY.MAX_LEVEL * perLevel,
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
    expect(hammockCapacityMilliFish(NO_BOOSTS)).toBe(BASE_CAPACITY);
  });

  it('grows by the otter friend capacity bonus', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, otterFriends: 1 })).toBe(
      (BASE_CAPACITY * (100 + OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT)) / 100,
    );
  });

  it('grows by the hammock level bonus per level (not compounding)', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: 3 })).toBe(
      (BASE_CAPACITY * (100 + 3 * HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT_PER_LEVEL)) / 100,
    );
  });

  it('adds the otter friend and hammock level bonuses together', () => {
    const boosts = { rodLevel: 0, otterFriends: 2, hammockLevel: 5 };
    const percent =
      100 +
      2 * OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT +
      5 * HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT_PER_LEVEL;

    expect(hammockCapacityMilliFish(boosts)).toBe((BASE_CAPACITY * percent) / 100);
  });

  it('is not changed by rod upgrades', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, rodLevel: 5 })).toBe(
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
