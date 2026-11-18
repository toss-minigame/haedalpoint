import { HAMMOCK_EXPAND_POLICY, OTTER_FRIEND_POLICY } from '../../../common/globals/index.js';
import {
  applyBait,
  enhanceRod,
  expandHammock,
  fillHammock,
  freezeOtterFriend,
  isOtterFriendMelting,
  otterFriendMeltsAt,
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

describe('fillHammock', () => {
  it('fills the hammock up to the capacity', () => {
    const { state: next, addedMilliFish } = fillHammock(state({ milliFish: 100 }), 1_000, 5_000);

    expect(next.milliFish).toBe(1_000);
    expect(addedMilliFish).toBe(900);
  });

  it('adds at most the max amount', () => {
    const { state: next, addedMilliFish } = fillHammock(state({ milliFish: 100 }), 1_000, 300);

    expect(next.milliFish).toBe(400);
    expect(addedMilliFish).toBe(300);
  });

  it('adds nothing when the hammock is already at or above the capacity', () => {
    const { state: next, addedMilliFish } = fillHammock(state({ milliFish: 1_200 }), 1_000, 300);

    expect(next.milliFish).toBe(1_200);
    expect(addedMilliFish).toBe(0);
  });

  it('does not count the gift as overflow', () => {
    const s = state({ overflowMilliFish: 7 });

    expect(fillHammock(s, 1_000, 1_000).state.overflowMilliFish).toBe(7);
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

describe('melting and freezing the otter friend', () => {
  const MINUTE_MS = 60 * 1000;
  const HOUR_MS = 60 * MINUTE_MS;
  const NOW = new Date('2026-11-02T03:00:00Z');
  const leavesIn = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE_MS);

  it('starts melting MELT_MINUTES before leaving', () => {
    const s = state({ otterFriendUntil: leavesIn(90) });

    expect(otterFriendMeltsAt(s)).toEqual(leavesIn(90 - OTTER_FRIEND_POLICY.MELT_MINUTES));
    expect(isOtterFriendMelting(s, NOW)).toBe(false);
  });

  it('is melting from MELT_MINUTES before leaving until it leaves', () => {
    expect(
      isOtterFriendMelting(
        state({ otterFriendUntil: leavesIn(OTTER_FRIEND_POLICY.MELT_MINUTES) }),
        NOW,
      ),
    ).toBe(true);
    expect(isOtterFriendMelting(state({ otterFriendUntil: leavesIn(1) }), NOW)).toBe(true);
  });

  it('is not melting once it has left or when it never came', () => {
    expect(isOtterFriendMelting(state({ otterFriendUntil: NOW }), NOW)).toBe(false);
    expect(isOtterFriendMelting(state(), NOW)).toBe(false);
    expect(otterFriendMeltsAt(state())).toBeNull();
  });

  it('stays FREEZE_HOURS longer when frozen', () => {
    const frozen = freezeOtterFriend(state({ otterFriendUntil: leavesIn(20) }));

    expect(frozen.otterFriendUntil).toEqual(
      new Date(leavesIn(20).getTime() + OTTER_FRIEND_POLICY.FREEZE_HOURS * HOUR_MS),
    );
  });

  it('leaves a state without a friend as it is', () => {
    const s = state();

    expect(freezeOtterFriend(s)).toBe(s);
  });
});
