import {
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import {
  fishPerHour,
  hammockCapacityNanoFish,
  hammockLevelBonusPercent,
  NANO_PER_FISH,
  NO_BOOSTS,
  nanoFishPerMs,
  rodSpeedBonusPercent,
  speedPercent,
  tossPointsPerDay,
} from '../lib/fishing-rate.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BASE_CAPACITY = Math.round(FISHING_POLICY.HAMMOCK_CAPACITY * NANO_PER_FISH);

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
    expect(hammockLevelBonusPercent(HAMMOCK_EXPAND_POLICY.MAX_LEVEL)).toBe(159.4);
  });
});

describe('rodSpeedBonusPercent', () => {
  it('is the rod part of the speed bonus', () => {
    expect(rodSpeedBonusPercent(4)).toBe(4 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL);
  });
});

describe('hammockCapacityNanoFish', () => {
  it('is the base capacity without the otter friend', () => {
    expect(hammockCapacityNanoFish(NO_BOOSTS)).toBe(BASE_CAPACITY);
  });

  it('grows by the otter friend capacity bonus', () => {
    expect(hammockCapacityNanoFish({ ...NO_BOOSTS, otterFriends: 1 })).toBe(
      (BASE_CAPACITY * (100 + OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT)) / 100,
    );
  });

  it('multiplies the capacity by 1.1 per hammock level (compounding)', () => {
    expect(hammockCapacityNanoFish({ ...NO_BOOSTS, hammockLevel: 3 })).toBe(
      Math.floor(BASE_CAPACITY * 1.1 ** 3),
    );
    expect(hammockCapacityNanoFish({ ...NO_BOOSTS, hammockLevel: 10 })).toBe(
      Math.floor(BASE_CAPACITY * 1.1 ** 10),
    );
  });

  it('adds the otter friend bonus first, then multiplies by the hammock level', () => {
    const boosts = { rodLevel: 0, otterFriends: 2, hammockLevel: 5, baitBonusPercent: 0 };
    const withFriends =
      (BASE_CAPACITY * (100 + 2 * OTTER_FRIEND_POLICY.CAPACITY_BONUS_PERCENT)) / 100;

    expect(hammockCapacityNanoFish(boosts)).toBe(Math.floor(withFriends * 1.1 ** 5));
  });

  it('is not changed by rod upgrades', () => {
    expect(hammockCapacityNanoFish({ ...NO_BOOSTS, rodLevel: 5 })).toBe(
      hammockCapacityNanoFish(NO_BOOSTS),
    );
  });
});

describe('base speed', () => {
  it('earns BASE_MONTHLY_TOSS_POINTS over BASE_MONTH_DAYS at 100%', () => {
    const fishPerMonth =
      (nanoFishPerMs(100) * FISHING_POLICY.BASE_MONTH_DAYS * DAY_MS) / NANO_PER_FISH;

    expect(fishPerMonth / FISHING_POLICY.FISH_PER_TOSS_POINT).toBeCloseTo(
      FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS,
      6,
    );
  });

  it('scales linearly with the speed percent', () => {
    expect(nanoFishPerMs(250)).toBeCloseTo(nanoFishPerMs(100) * 2.5, 12);
  });

  it('reports fish per hour', () => {
    expect(fishPerHour(100)).toBeCloseTo((nanoFishPerMs(100) * HOUR_MS) / NANO_PER_FISH, 9);
  });

  it('reports toss points per day', () => {
    expect(tossPointsPerDay(100)).toBeCloseTo(
      FISHING_POLICY.BASE_MONTHLY_TOSS_POINTS / FISHING_POLICY.BASE_MONTH_DAYS,
      9,
    );
  });
});

describe('nano-fish precision', () => {
  it('loses less than one nano-fish per settlement at the base speed', () => {
    expect(nanoFishPerMs(100)).toBeGreaterThan(1);
  });

  it('holds fractional capacities without rounding to whole fish', () => {
    expect(BASE_CAPACITY / NANO_PER_FISH).toBe(FISHING_POLICY.HAMMOCK_CAPACITY);
  });
});

describe('speedPercent bait', () => {
  it('adds the bait bonus on top of the other speed bonuses', () => {
    expect(speedPercent({ ...NO_BOOSTS, rodLevel: 2, baitBonusPercent: 5 })).toBe(
      100 + 2 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL + 5,
    );
  });

  it('does not change the hammock capacity', () => {
    expect(hammockCapacityNanoFish({ ...NO_BOOSTS, baitBonusPercent: 5 })).toBe(
      hammockCapacityNanoFish(NO_BOOSTS),
    );
  });
});
