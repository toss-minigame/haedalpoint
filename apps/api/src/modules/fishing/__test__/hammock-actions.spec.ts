import { HAMMOCK_EXPAND_POLICY, OTTER_FRIEND_POLICY } from '../../../common/globals/index.js';
import {
  applyBait,
  enhanceRod,
  expandHammock,
  fillHammock,
  summonOtterFriend,
  takeAllFish,
} from '../lib/hammock-actions.js';
import type { HammockState } from '../lib/settle-hammock.js';

const TODAY = '2026-11-02';
const YESTERDAY = '2026-11-01';
const HOUR_MS = 60 * 60 * 1000;
// KST 2026-11-02 12:00
const NOW = new Date('2026-11-02T03:00:00Z');
const STAY_MS = OTTER_FRIEND_POLICY.STAY_HOURS * HOUR_MS;

function state(overrides: Partial<HammockState> = {}): HammockState {
  return {
    nanoFish: 0,
    settledAt: NOW,
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendUntil: null,
    otterFriendCount: 0,
    hammockLevel: 0,
    hammockLevelDate: null,
    baitBonusPercent: 0,
    baitDate: null,
    overflowNanoFish: 0,
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
  it('makes one otter friend fish for 24 hours from the settled time', () => {
    expect(summonOtterFriend(state())).toMatchObject({
      otterFriendUntil: new Date(NOW.getTime() + STAY_MS),
      otterFriendCount: 1,
    });
  });

  it('adds one more otter friend and keeps both until 24 hours after the new one comes', () => {
    const s = state({ otterFriendUntil: new Date(NOW.getTime() + HOUR_MS), otterFriendCount: 1 });

    expect(summonOtterFriend(s)).toMatchObject({
      otterFriendUntil: new Date(NOW.getTime() + STAY_MS),
      otterFriendCount: 2,
    });
  });

  it('starts from one when the friends have already left', () => {
    const s = state({ otterFriendUntil: new Date(NOW.getTime() - 1), otterFriendCount: 2 });

    expect(summonOtterFriend(s).otterFriendCount).toBe(1);
  });

  it('stops at the max number of friends', () => {
    const s = state({
      otterFriendUntil: new Date(NOW.getTime() + HOUR_MS),
      otterFriendCount: OTTER_FRIEND_POLICY.MAX_FRIENDS,
    });

    expect(summonOtterFriend(s).otterFriendCount).toBe(OTTER_FRIEND_POLICY.MAX_FRIENDS);
  });
});

describe('fillHammock', () => {
  it('fills the hammock up to the capacity', () => {
    const { state: next, addedNanoFish } = fillHammock(state({ nanoFish: 100 }), 1_000, 5_000);

    expect(next.nanoFish).toBe(1_000);
    expect(addedNanoFish).toBe(900);
  });

  it('adds at most the max amount', () => {
    const { state: next, addedNanoFish } = fillHammock(state({ nanoFish: 100 }), 1_000, 300);

    expect(next.nanoFish).toBe(400);
    expect(addedNanoFish).toBe(300);
  });

  it('adds nothing when the hammock is already at or above the capacity', () => {
    const { state: next, addedNanoFish } = fillHammock(state({ nanoFish: 1_200 }), 1_000, 300);

    expect(next.nanoFish).toBe(1_200);
    expect(addedNanoFish).toBe(0);
  });

  it('does not count the gift as overflow', () => {
    const s = state({ overflowNanoFish: 7 });

    expect(fillHammock(s, 1_000, 1_000).state.overflowNanoFish).toBe(7);
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
    const { state: next, takenNanoFish } = takeAllFish(state({ nanoFish: 123_456_789 }));

    expect(takenNanoFish).toBe(123_456_789);
    expect(next.nanoFish).toBe(0);
  });

  it('takes nothing from an empty hammock', () => {
    const { state: next, takenNanoFish } = takeAllFish(state({ nanoFish: 0 }));

    expect(takenNanoFish).toBe(0);
    expect(next.nanoFish).toBe(0);
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
