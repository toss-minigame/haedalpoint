import {
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import {
  enhanceRod,
  expandHammock,
  summonOtterFriend,
  takeWholeFish,
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
    otterFriendDate: null,
    otterFriendCount: 0,
    hammockLevel: 0,
    hammockLevelDate: null,
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

  it('stops at the max level', () => {
    const s = state({ rodLevel: ROD_POLICY.MAX_LEVEL - 1, rodLevelDate: TODAY });

    expect(enhanceRod(s, 3, TODAY).rodLevel).toBe(ROD_POLICY.MAX_LEVEL);
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

describe('takeWholeFish', () => {
  it('takes the whole fish and leaves the fraction in the hammock', () => {
    const { state: next, takenFish } = takeWholeFish(state({ milliFish: 12_345_678 }));

    expect(takenFish).toBe(12_345);
    expect(next.milliFish).toBe(678);
  });

  it('takes nothing when there is less than one fish', () => {
    const { state: next, takenFish } = takeWholeFish(state({ milliFish: 999 }));

    expect(takenFish).toBe(0);
    expect(next.milliFish).toBe(999);
  });
});
