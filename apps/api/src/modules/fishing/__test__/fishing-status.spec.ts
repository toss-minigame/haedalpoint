import { FISHING_POLICY, ROD_POLICY } from '../../../common/globals/index.js';
import { fishPerHour, hammockCapacityMilliFish } from '../lib/fishing-rate.js';
import { buildFishingStatus, toHammockState } from '../lib/fishing-status.js';
import type { HammockState } from '../lib/settle-hammock.js';

const TODAY = '2026-11-02';
const NOW = new Date('2026-11-02T03:00:00Z');

function hammock(overrides: Partial<HammockState> = {}): HammockState {
  return {
    milliFish: 1_500,
    settledAt: NOW,
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendDate: null,
    ...overrides,
  };
}

describe('buildFishingStatus', () => {
  it('describes a hammock without boosts', () => {
    const status = buildFishingStatus(hammock(), 300, NOW);

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
      boostsResetAt: '2026-11-02T15:00:00.000Z',
      warehouseFish: 300,
    });
    expect(typeof status.hammockFullAt).toBe('string');
  });

  it("reflects today's rod level and otter friend", () => {
    const status = buildFishingStatus(
      hammock({ rodLevel: 3, rodLevelDate: TODAY, otterFriendDate: TODAY }),
      0,
      NOW,
    );

    expect(status).toMatchObject({
      rodLevel: 3,
      rodSpeedBonusPercent: 30,
      otterFriendActive: true,
      speedPercent: 230,
      hammockCapacity: hammockCapacityMilliFish({ rodLevel: 3, otterFriend: true }) / 1000,
    });
  });

  it('has no fill time when the hammock is full', () => {
    const full = hammock({ milliFish: FISHING_POLICY.HAMMOCK_CAPACITY * 1000 });

    expect(buildFishingStatus(full, 0, NOW).hammockFullAt).toBeNull();
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
    });
  });
});
