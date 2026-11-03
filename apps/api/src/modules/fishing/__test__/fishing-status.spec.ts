import {
  AD_ROD_POLICY,
  FISHING_POLICY,
  HAMMOCK_EXPAND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import { fishPerHour, hammockCapacityMilliFish, NO_BOOSTS } from '../lib/fishing-rate.js';
import { buildFishingStatus, type FishingAccount, toHammockState } from '../lib/fishing-status.js';
import type { HammockState } from '../lib/settle-hammock.js';

const TODAY = '2026-11-02';
const NOW = new Date('2026-11-02T03:00:00Z');
const MINUTE_MS = 60 * 1000;

function account(overrides: Partial<FishingAccount> = {}): FishingAccount {
  return { warehouseFish: 0, adRodEnhancedAt: null, adHammockExpandedAt: null, ...overrides };
}

function hammock(overrides: Partial<HammockState> = {}): HammockState {
  return {
    milliFish: 1_500,
    settledAt: NOW,
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendDate: null,
    otterFriendCount: 0,
    hammockLevel: 0,
    hammockLevelDate: null,
    ...overrides,
  };
}

describe('buildFishingStatus', () => {
  it('describes a hammock without boosts', () => {
    const status = buildFishingStatus(hammock(), account({ warehouseFish: 300 }), NOW);

    expect(status).toMatchObject({
      serverTime: NOW.toISOString(),
      hammockFish: 1.5,
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
      warehouseFish: 300,
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
      rodSpeedBonusPercent: 30,
      otterFriendActive: true,
      otterFriendCount: 1,
      speedPercent: 230,
      hammockCapacity:
        hammockCapacityMilliFish({ ...NO_BOOSTS, rodLevel: 3, otterFriends: 1 }) / 1000,
    });
  });

  it("reflects today's hammock level", () => {
    const s = hammock({ hammockLevel: 3, hammockLevelDate: TODAY });
    const status = buildFishingStatus(s, account(), NOW);

    expect(status).toMatchObject({
      hammockLevel: 3,
      hammockLevelBonusPercent: 30,
      hammockCapacity: hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: 3 }) / 1000,
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
    const full = hammock({ milliFish: FISHING_POLICY.HAMMOCK_CAPACITY * 1000 });

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
      otterFriendDate: null,
      otterFriendCount: 0,
      hammockLevel: 0,
      hammockLevelDate: null,
      adRodEnhancedAt: null,
      adHammockExpandedAt: null,
      warehouseFish: 5,
      createdAt: NOW,
      updatedAt: NOW,
    };

    expect(toHammockState(row)).toEqual({
      milliFish: 10,
      settledAt: NOW,
      rodLevel: 2,
      rodLevelDate: TODAY,
      otterFriendDate: null,
      otterFriendCount: 0,
      hammockLevel: 0,
      hammockLevelDate: null,
    });
  });
});
