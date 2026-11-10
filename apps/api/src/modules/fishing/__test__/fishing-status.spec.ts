import {
  AD_ROD_POLICY,
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import {
  fishPerHour,
  hammockCapacityNanoFish,
  NANO_PER_FISH,
  NO_BOOSTS,
} from '../lib/fishing-rate.js';
import { buildFishingStatus, type FishingAccount, toHammockState } from '../lib/fishing-status.js';
import type { HammockState } from '../lib/settle-hammock.js';

const TODAY = '2026-11-02';
const NOW = new Date('2026-11-02T03:00:00Z');
const MINUTE_MS = 60 * 1000;

function account(overrides: Partial<FishingAccount> = {}): FishingAccount {
  return { warehouseNanoFish: 0, adRodEnhancedAt: null, adHammockExpandedAt: null, ...overrides };
}

function hammock(overrides: Partial<HammockState> = {}): HammockState {
  return {
    nanoFish: 123_456_789,
    settledAt: NOW,
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendDate: null,
    otterFriendCount: 0,
    hammockLevel: 0,
    hammockLevelDate: null,
    baitBonusPercent: 0,
    baitDate: null,
    ...overrides,
  };
}

describe('buildFishingStatus', () => {
  it('describes a hammock without boosts', () => {
    const status = buildFishingStatus(
      hammock(),
      account({ warehouseNanoFish: 1_500_000_000 }),
      NOW,
    );

    expect(status).toMatchObject({
      serverTime: NOW.toISOString(),
      hammockFish: 0.123456789,
      hammockCapacity: FISHING_POLICY.HAMMOCK_CAPACITY,
      fishPerHour: fishPerHour(100),
      speedPercent: 100,
      rodLevel: 0,
      rodMaxLevel: ROD_POLICY.MAX_LEVEL,
      rodSpeedBonusPercent: 0,
      otterFriendActive: false,
      otterFriendCount: 0,
      hammockLevel: 0,
      hammockMaxLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL,
      hammockLevelBonusPercent: 0,
      adHammockBonusPercent:
        HAMMOCK_EXPAND_POLICY.LEVELS_PER_AD *
        HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT_PER_LEVEL,
      adHammockExpandAvailableAt: null,
      adRodSpeedBonusPercent:
        AD_ROD_POLICY.LEVELS_PER_AD * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
      adRodEnhanceAvailableAt: null,
      boostsResetAt: '2026-11-02T15:00:00.000Z',
      warehouseFish: 1.5,
    });
    expect(typeof status.hammockFullAt).toBe('string');
  });

  it("reflects today's rod level and otter friend", () => {
    const status = buildFishingStatus(
      hammock({ rodLevel: 3, rodLevelDate: TODAY, otterFriendDate: TODAY, otterFriendCount: 1 }),
      account(),
      NOW,
    );

    expect(status).toMatchObject({
      rodLevel: 3,
      rodSpeedBonusPercent: 3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL,
      otterFriendActive: true,
      otterFriendCount: 1,
      speedPercent:
        100 +
        3 * ROD_POLICY.SPEED_BONUS_PERCENT_PER_LEVEL +
        OTTER_FRIEND_POLICY.SPEED_BONUS_PERCENT,
      hammockCapacity:
        hammockCapacityNanoFish({ ...NO_BOOSTS, rodLevel: 3, otterFriends: 1 }) / NANO_PER_FISH,
    });
  });

  it("reflects today's hammock level", () => {
    const s = hammock({ hammockLevel: 3, hammockLevelDate: TODAY });
    const status = buildFishingStatus(s, account(), NOW);

    expect(status).toMatchObject({
      hammockLevel: 3,
      hammockLevelBonusPercent: 3 * HAMMOCK_EXPAND_POLICY.CAPACITY_BONUS_PERCENT_PER_LEVEL,
      hammockCapacity: hammockCapacityNanoFish({ ...NO_BOOSTS, hammockLevel: 3 }) / NANO_PER_FISH,
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
    const full = hammock({ nanoFish: hammockCapacityNanoFish(NO_BOOSTS) });

    expect(buildFishingStatus(full, account(), NOW).hammockFullAt).toBeNull();
  });
});

describe('toHammockState', () => {
  it('picks the hammock fields from a fishing_states row', () => {
    const row = {
      id: 'state-1',
      userId: 'user-1',
      hammockNanoFish: 10,
      settledAt: NOW,
      rodLevel: 2,
      rodLevelDate: TODAY,
      otterFriendDate: null,
      otterFriendCount: 0,
      hammockLevel: 0,
      hammockLevelDate: null,
      baitBonusPercent: 0,
      baitDate: null,
      adRodEnhancedAt: null,
      adHammockExpandedAt: null,
      warehouseNanoFish: 5,
      createdAt: NOW,
      updatedAt: NOW,
    };

    expect(toHammockState(row)).toEqual({
      nanoFish: 10,
      settledAt: NOW,
      rodLevel: 2,
      rodLevelDate: TODAY,
      otterFriendDate: null,
      otterFriendCount: 0,
      hammockLevel: 0,
      hammockLevelDate: null,
      baitBonusPercent: 0,
      baitDate: null,
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
