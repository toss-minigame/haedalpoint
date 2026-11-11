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
    nanoFish: 0,
    settledAt: new Date('2026-11-02T03:00:00Z'),
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendDate: null,
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
  it('makes one otter friend fish today', () => {
    expect(summonOtterFriend(state(), TODAY)).toMatchObject({
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });
  });

  it('adds one more otter friend on the same day', () => {
    const s = state({ otterFriendDate: TODAY, otterFriendCount: 1 });

    expect(summonOtterFriend(s, TODAY).otterFriendCount).toBe(2);
  });

  it('starts from one when the friends belong to another day', () => {
    const s = state({ otterFriendDate: YESTERDAY, otterFriendCount: 2 });

    expect(summonOtterFriend(s, TODAY)).toMatchObject({
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });
  });

  it('stops at the daily max', () => {
    const s = state({ otterFriendDate: TODAY, otterFriendCount: OTTER_FRIEND_POLICY.MAX_PER_DAY });

    expect(summonOtterFriend(s, TODAY).otterFriendCount).toBe(OTTER_FRIEND_POLICY.MAX_PER_DAY);
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
