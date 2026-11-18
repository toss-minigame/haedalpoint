import {
  AD_ROD_POLICY,
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import {
  fishPerHour,
  hammockCapacityMilliFish,
  MILLI_PER_FISH,
  NO_BOOSTS,
} from '../lib/fishing-rate.js';
import { buildFishingStatus, type FishingAccount, toHammockState } from '../lib/fishing-status.js';
import type { HammockState } from '../lib/settle-hammock.js';

const TODAY = '2026-11-02';
const NOW = new Date('2026-11-02T03:00:00Z');
const FRIEND_LEAVES = new Date('2026-11-03T01:00:00Z');
const MINUTE_MS = 60 * 1000;

function account(overrides: Partial<FishingAccount> = {}): FishingAccount {
  return {
    warehouseMilliFish: 0,
    adRodEnhancedAt: null,
    adHammockExpandedAt: null,
    otterFriendFrozen: false,
    ...overrides,
  };
}

function hammock(overrides: Partial<HammockState> = {}): HammockState {
  return {
    milliFish: 12_345_678,
    settledAt: NOW,
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendUntil: null,
    hammockLevel: 0,
    hammockLevelDate: null,
    baitBonusPercent: 0,
    baitDate: null,
    overflowMilliFish: 0,
    ...overrides,
  };
}

describe('buildFishingStatus', () => {
  it('describes a hammock without boosts', () => {
    const status = buildFishingStatus(
      hammock(),
      account({ warehouseMilliFish: 1_500_000_000 }),
      NOW,
    );

    expect(status).toMatchObject({
      serverTime: NOW.toISOString(),
      hammockFish: 12_345.678,
      hammockCapacity: FISHING_POLICY.HAMMOCK_CAPACITY,
      fishPerHour: fishPerHour(100),
      speedPercent: 100,
      rodLevel: 0,
      rodMaxLevel: null,
      rodSpeedBonusPercent: 0,
      otterFriendActive: false,
      otterFriendCount: 0,
      otterFriendUntil: null,
      hammockLevel: 0,
      hammockMaxLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL,
      hammockLevelBonusPercent: 0,
      adHammockBonusPercent: HAMMOCK_EXPAND_POLICY.CAPACITY_GROWTH_PERCENT_PER_LEVEL,
      adHammockRodSpeedBonusPercent:
        HAMMOCK_EXPAND_POLICY.ROD_LEVELS_PER_EXPAND * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
      adHammockExpandAvailableAt: null,
      adRodSpeedBonusPercent:
        AD_ROD_POLICY.LEVELS_PER_AD * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
      adRodEnhanceAvailableAt: null,
      boostsResetAt: '2026-11-02T15:00:00.000Z',
      warehouseFish: 1_500_000,
    });
    expect(typeof status.hammockFullAt).toBe('string');
  });

  it("reflects today's rod level and otter friend", () => {
    const status = buildFishingStatus(
      hammock({ rodLevel: 3, rodLevelDate: TODAY, otterFriendUntil: FRIEND_LEAVES }),
      account(),
      NOW,
    );

    expect(status).toMatchObject({
      rodLevel: 3,
      rodSpeedBonusPercent: 3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
      otterFriendActive: true,
      otterFriendCount: 1,
      otterFriendUntil: FRIEND_LEAVES.toISOString(),
      speedPercent:
        100 +
        3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL +
        OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT,
      hammockCapacity:
        hammockCapacityMilliFish({ ...NO_BOOSTS, rodLevel: 3, otterFriends: 1 }) / MILLI_PER_FISH,
    });
  });

  it("reflects today's hammock level", () => {
    const s = hammock({ hammockLevel: 3, hammockLevelDate: TODAY });
    const status = buildFishingStatus(s, account(), NOW);

    expect(status).toMatchObject({
      hammockLevel: 3,
      hammockLevelBonusPercent: 33.1,
      hammockCapacity: hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: 3 }) / MILLI_PER_FISH,
    });
  });

  it('tells when the ad hammock cooldown ends', () => {
    const expandedAt = new Date(NOW.getTime() - 5 * MINUTE_MS);
    const status = buildFishingStatus(hammock(), account({ adHammockExpandedAt: expandedAt }), NOW);

    expect(status.adHammockExpandAvailableAt).toBe(
      new Date(
        expandedAt.getTime() + HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES * MINUTE_MS,
      ).toISOString(),
    );
  });

  it('tells when the ad rod cooldown ends', () => {
    const enhancedAt = new Date(NOW.getTime() - 5 * MINUTE_MS);
    const status = buildFishingStatus(hammock(), account({ adRodEnhancedAt: enhancedAt }), NOW);

    expect(status.adRodEnhanceAvailableAt).toBe(
      new Date(enhancedAt.getTime() + AD_ROD_POLICY.COOLDOWN_MINUTES * MINUTE_MS).toISOString(),
    );
  });

  it('allows the ad rod enhancement once the cooldown has passed', () => {
    const enhancedAt = new Date(NOW.getTime() - AD_ROD_POLICY.COOLDOWN_MINUTES * MINUTE_MS);

    const status = buildFishingStatus(hammock(), account({ adRodEnhancedAt: enhancedAt }), NOW);

    expect(status.adRodEnhanceAvailableAt).toBeNull();
  });

  it('has no fill time when the hammock is full', () => {
    const full = hammock({ milliFish: hammockCapacityMilliFish(NO_BOOSTS) });

    expect(buildFishingStatus(full, account(), NOW).hammockFullAt).toBeNull();
  });
});

describe('toHammockState', () => {
  it('picks the hammock fields from a fishing_states row', () => {
    const row = {
      id: 'state-1',
      userId: 'user-1',
      hammockMilliFish: 10,
      settledAt: NOW,
      rodLevel: 2,
      rodLevelDate: TODAY,
      otterFriendUntil: null,
      hammockLevel: 0,
      hammockLevelDate: null,
      baitBonusPercent: 0,
      baitDate: null,
      overflowMilliFish: 7,
      adRodEnhancedAt: null,
      adHammockExpandedAt: null,
      warehouseMilliFish: 5,
      createdAt: NOW,
      updatedAt: NOW,
    };

    expect(toHammockState(row)).toEqual({
      milliFish: 10,
      settledAt: NOW,
      rodLevel: 2,
      rodLevelDate: TODAY,
      otterFriendUntil: null,
      hammockLevel: 0,
      hammockLevelDate: null,
      baitBonusPercent: 0,
      baitDate: null,
      overflowMilliFish: 7,
    });
  });
});

describe('buildFishingStatus bait', () => {
  it("reflects today's bait in the speed", () => {
    const status = buildFishingStatus(
      hammock({ baitBonusPercent: 5, baitDate: TODAY }),
      account(),
      NOW,
    );

    expect(status).toMatchObject({ baitSpeedBonusPercent: 5, speedPercent: 105 });
  });

  it("ignores yesterday's bait", () => {
    const status = buildFishingStatus(
      hammock({ baitBonusPercent: 5, baitDate: '2026-11-01' }),
      account(),
      NOW,
    );

    expect(status).toMatchObject({ baitSpeedBonusPercent: 0, speedPercent: 100 });
  });
});

describe('buildFishingStatus melting otter friend', () => {
  const HOUR_MS = 60 * MINUTE_MS;
  const leavesIn = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE_MS);

  it('tells when the friend starts melting (MELT_MINUTES before leaving)', () => {
    const status = buildFishingStatus(hammock({ otterFriendUntil: leavesIn(180) }), account(), NOW);

    expect(status).toMatchObject({
      otterFriendMeltsAt: leavesIn(180 - OTTER_FRIEND_POLICY.MELT_MINUTES).toISOString(),
      otterFriendFreezable: false,
      otterFriendFrozen: false,
      otterFriendFreezeHours: OTTER_FRIEND_POLICY.FREEZE_HOURS,
    });
  });

  it('can be frozen while melting', () => {
    const status = buildFishingStatus(hammock({ otterFriendUntil: leavesIn(30) }), account(), NOW);

    expect(status.otterFriendFreezable).toBe(true);
  });

  it('cannot be frozen twice in one visit', () => {
    const status = buildFishingStatus(
      hammock({ otterFriendUntil: leavesIn(30) }),
      account({ otterFriendFrozen: true }),
      NOW,
    );

    expect(status).toMatchObject({ otterFriendFreezable: false, otterFriendFrozen: true });
  });

  it('has nothing to freeze once the friend has left', () => {
    const status = buildFishingStatus(
      hammock({ otterFriendUntil: new Date(NOW.getTime() - HOUR_MS) }),
      account({ otterFriendFrozen: true }),
      NOW,
    );

    expect(status).toMatchObject({
      otterFriendActive: false,
      otterFriendMeltsAt: null,
      otterFriendFreezable: false,
      otterFriendFrozen: false,
    });
  });
});
