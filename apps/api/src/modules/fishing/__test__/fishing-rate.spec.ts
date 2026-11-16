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
  MILLI_PER_FISH,
  milliFishPerMs,
  NO_BOOSTS,
  rodSpeedBonusPercent,
  speedPercent,
  tossPointsPerDay,
} from '../lib/fishing-rate.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BASE_CAPACITY = Math.round(FISHING_POLICY.HAMMOCK_CAPACITY * MILLI_PER_FISH);

describe('speedPercent', () => {
  it('is 100% without boosts', () => {
    expect(speedPercent(NO_BOOSTS)).toBe(100);
  });

  it('adds the per-level bonus of the base speed per rod level (not compounding)', () => {
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
  it('grows 10% of the previous capacity per level (compounding), rounded to one decimal', () => {
    expect(hammockLevelBonusPercent(0)).toBe(0);
    expect(hammockLevelBonusPercent(1)).toBe(10);
    expect(hammockLevelBonusPercent(2)).toBe(21);
    expect(hammockLevelBonusPercent(3)).toBe(33.1);
    expect(hammockLevelBonusPercent(HAMMOCK_EXPAND_POLICY.MAX_LEVEL)).toBe(114.4);
  });
});

describe('hammock levels n = 1..9', () => {
  it('starts at 30,000 fish (n=1) and reaches about 64,308 fish at n=9', () => {
    expect(hammockCapacityMilliFish(NO_BOOSTS) / MILLI_PER_FISH).toBe(30_000);
    expect(HAMMOCK_EXPAND_POLICY.MAX_LEVEL).toBe(8);
    expect(
      Math.floor(
        hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL }) /
          MILLI_PER_FISH,
      ),
    ).toBe(64_307);
  });

  it('adds 10% of the base capacity for the otter friend', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, otterFriends: 1 }) / MILLI_PER_FISH).toBe(
      33_000,
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

  it('multiplies the capacity by 1.1 per hammock level (compounding)', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: 3 })).toBe(
      Math.floor(BASE_CAPACITY * 1.1 ** 3),
    );
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: 8 })).toBe(
      Math.floor(BASE_CAPACITY * 1.1 ** 8),
    );
  });

  it('adds the otter friend bonus first, then multiplies by the hammock level', () => {
    const boosts = { rodLevel: 0, otterFriends: 2, hammockLevel: 5, baitBonusPercent: 0 };
    const withFriends =
      (BASE_CAPACITY * (100 + 2 * OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT)) / 100;

    expect(hammockCapacityMilliFish(boosts)).toBe(Math.floor(withFriends * 1.1 ** 5));
  });

  it('is not changed by rod upgrades', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, rodLevel: 5 })).toBe(
      hammockCapacityMilliFish(NO_BOOSTS),
    );
  });
});

describe('base speed', () => {
  it('earns BASE_MONTHLY_TOSS_POINTS over BASE_MONTH_DAYS at 100%', () => {
    const fishPerMonth =
      (milliFishPerMs(100) * FISHING_POLICY.BASE_MONTH_DAYS * DAY_MS) / MILLI_PER_FISH;

    expect(fishPerMonth / FISHING_POLICY.FISH_PER_TOSS_POINT).toBeCloseTo(
      FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS,
      6,
    );
  });

  it('scales linearly with the speed percent', () => {
    expect(milliFishPerMs(250)).toBeCloseTo(milliFishPerMs(100) * 2.5, 12);
  });

  it('reports fish per hour', () => {
    expect(fishPerHour(100)).toBeCloseTo((milliFishPerMs(100) * HOUR_MS) / MILLI_PER_FISH, 9);
  });

  it('reports toss points per day', () => {
    expect(tossPointsPerDay(100)).toBeCloseTo(
      FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS / FISHING_POLICY.BASE_MONTH_DAYS,
      9,
    );
  });
});

describe('milli-fish precision', () => {
  it('catches one fish (1,000 milli-fish) a second at the base speed', () => {
    expect(milliFishPerMs(100) * 1000).toBeCloseTo(MILLI_PER_FISH, 9);
    expect(fishPerHour(100)).toBeCloseTo(3_600, 9);
  });

  it('keeps the +1% rod bonus (0.01 fish a second) as whole milli-fish', () => {
    expect(milliFishPerMs(101) * 1000).toBeCloseTo(1_010, 9);
  });

  it('keeps the monthly budget well inside the safe integer range', () => {
    const budgetMilliFish =
      FISHING_POLICY.MONTHLY_TOSS_POINT_BUDGET *
      FISHING_POLICY.FISH_PER_TOSS_POINT *
      MILLI_PER_FISH;
    expect(budgetMilliFish).toBeLessThan(Number.MAX_SAFE_INTEGER / 1000);
  });

  it('holds fractional capacities without rounding to whole fish', () => {
    expect(BASE_CAPACITY / MILLI_PER_FISH).toBe(FISHING_POLICY.HAMMOCK_CAPACITY);
  });
});

describe('speedPercent bait', () => {
  it('adds the bait bonus on top of the other speed bonuses', () => {
    expect(speedPercent({ ...NO_BOOSTS, rodLevel: 2, baitBonusPercent: 5 })).toBe(
      100 + 2 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL + 5,
    );
  });

  it('does not change the hammock capacity', () => {
    expect(hammockCapacityMilliFish({ ...NO_BOOSTS, baitBonusPercent: 5 })).toBe(
      hammockCapacityMilliFish(NO_BOOSTS),
    );
  });
});
