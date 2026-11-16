import { HAMMOCK_EXPAND_POLICY, OTTER_FRIEND_POLICY } from '../../../common/globals/index.js';
import {
  applyBait,
  enhanceRod,
  expandHammock,
  summonOtterFriend,
  takeAllFish,
} from '../lib/hammock-actions.js';
import type { HammockState } from '../lib/settle-hammock.js';

const TODAY = '2026-11-02';
const YESTERDAY = '2026-11-01';

function state(overrides: Partial<HammockState> = {}): HammockState {
  return {
    milliFish: 0,
    settledAt: new Date('2026-11-02T03:00:00Z'),
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

describe('enhanceRod', () => {
  it("raises today's rod level", () => {
    const next = enhanceRod(state({ rodLevel: 2, rodLevelDate: TODAY }), 1, TODAY);

    expect(next).toMatchObject({ rodLevel: 3, rodLevelDate: TODAY });
  });

  it('starts from level 0 when the level belongs to another day', () => {
    const next = enhanceRod(state({ rodLevel: 5, rodLevelDate: YESTERDAY }), 1, TODAY);

    expect(next).toMatchObject({ rodLevel: 1, rodLevelDate: TODAY });
  });

  it('has no daily max level', () => {
    const s = state({ rodLevel: 50, rodLevelDate: TODAY });

    expect(enhanceRod(s, 3, TODAY).rodLevel).toBe(53);
  });

  it('does not mutate the given state', () => {
    const s = state();

    enhanceRod(s, 1, TODAY);

    expect(s.rodLevel).toBe(0);
  });
});

describe('summonOtterFriend', () => {
  const NOW = new Date('2026-11-02T03:00:00Z');
  const IN_24_HOURS = new Date('2026-11-03T03:00:00Z');

  it('brings the otter friend for 24 hours from now', () => {
    expect(OTTER_FRIEND_POLICY.DURATION_HOURS).toBe(24);
    expect(summonOtterFriend(state(), NOW).otterFriendUntil).toEqual(IN_24_HOURS);
  });

  it('restarts the 24 hours when the previous friend already left', () => {
    const s = state({ otterFriendUntil: new Date('2026-11-01T00:00:00Z') });

    expect(summonOtterFriend(s, NOW).otterFriendUntil).toEqual(IN_24_HOURS);
  });

  it('never shortens the stay of a friend who leaves later', () => {
    const later = new Date('2026-11-04T00:00:00Z');

    expect(summonOtterFriend(state({ otterFriendUntil: later }), NOW).otterFriendUntil).toEqual(
      later,
    );
  });
});

describe('expandHammock', () => {
  it("raises today's hammock level", () => {
    const next = expandHammock(state({ hammockLevel: 2, hammockLevelDate: TODAY }), 1, TODAY);

    expect(next).toMatchObject({ hammockLevel: 3, hammockLevelDate: TODAY });
  });

  it('starts from level 0 when the level belongs to another day', () => {
    const next = expandHammock(state({ hammockLevel: 4, hammockLevelDate: YESTERDAY }), 1, TODAY);

    expect(next).toMatchObject({ hammockLevel: 1, hammockLevelDate: TODAY });
  });

  it('stops at the max level', () => {
    const s = state({ hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL, hammockLevelDate: TODAY });

    expect(expandHammock(s, 1, TODAY).hammockLevel).toBe(HAMMOCK_EXPAND_POLICY.MAX_LEVEL);
  });
});

describe('takeAllFish', () => {
  it('takes every fish including the fraction and empties the hammock', () => {
    const { state: next, takenMilliFish } = takeAllFish(state({ milliFish: 123_456_789 }));

    expect(takenMilliFish).toBe(123_456_789);
    expect(next.milliFish).toBe(0);
  });

  it('takes nothing from an empty hammock', () => {
    const { state: next, takenMilliFish } = takeAllFish(state({ milliFish: 0 }));

    expect(takenMilliFish).toBe(0);
    expect(next.milliFish).toBe(0);
  });
});

describe('applyBait', () => {
  it("sets today's bait bonus", () => {
    const next = applyBait(state(), 3, TODAY);

    expect(next).toMatchObject({ baitBonusPercent: 3, baitDate: TODAY });
  });

  it("replaces another day's bait", () => {
    const next = applyBait(state({ baitBonusPercent: 5, baitDate: YESTERDAY }), 1, TODAY);

    expect(next).toMatchObject({ baitBonusPercent: 1, baitDate: TODAY });
  });

  it('does not mutate the given state', () => {
    const before = state();

    applyBait(before, 2, TODAY);

    expect(before).toMatchObject({ baitBonusPercent: 0, baitDate: null });
  });
});
