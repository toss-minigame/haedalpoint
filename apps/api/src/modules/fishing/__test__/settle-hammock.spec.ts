import { FISHING_POLICY } from '../../../common/globals/index.js';
import {
  type Boosts,
  hammockCapacityMilliFish,
  MILLI_PER_FISH,
  milliFishPerMs,
  NO_BOOSTS,
  speedPercent,
} from '../lib/fishing-rate.js';
import {
  boostsAt,
  type HammockState,
  predictHammockFullAt,
  settleHammock,
} from '../lib/settle-hammock.js';

const HOUR_MS = 60 * 60 * 1000;
const TODAY = '2026-11-02';
const YESTERDAY = '2026-11-01';
// KST 2026-11-02 12:00
const NOON = new Date('2026-11-02T03:00:00Z');
// KST 2026-11-03 00:00
const MIDNIGHT = new Date('2026-11-02T15:00:00Z');

const BASE_CAPACITY = Math.round(FISHING_POLICY.HAMMOCK_CAPACITY * MILLI_PER_FISH);
const FRIEND_DAY: Boosts = { ...NO_BOOSTS, otterFriends: 1 };

function state(overrides: Partial<HammockState> = {}): HammockState {
  return {
    milliFish: 0,
    settledAt: NOON,
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

function caught(durationMs: number, boosts: Boosts = NO_BOOSTS): number {
  return Math.floor(durationMs * milliFishPerMs(speedPercent(boosts)));
}

function shiftMs(at: Date, ms: number): Date {
  return new Date(at.getTime() + ms);
}

describe('boostsAt', () => {
  it('applies the rod level on its own date and the otter friend until it leaves', () => {
    const s = state({
      rodLevel: 3,
      rodLevelDate: TODAY,
      otterFriendUntil: MIDNIGHT,
    });

    expect(boostsAt(s, NOON)).toEqual({
      rodLevel: 3,
      otterFriends: 1,
      hammockLevel: 0,
      baitBonusPercent: 0,
    });
    expect(boostsAt(s, MIDNIGHT)).toEqual(NO_BOOSTS);
  });

  it('counts the otter friend and the expanded hammock', () => {
    const s = state({
      otterFriendUntil: MIDNIGHT,
      hammockLevel: 3,
      hammockLevelDate: TODAY,
    });

    expect(boostsAt(s, NOON)).toEqual({
      rodLevel: 0,
      otterFriends: 1,
      hammockLevel: 3,
      baitBonusPercent: 0,
    });
    expect(boostsAt(s, MIDNIGHT)).toEqual(NO_BOOSTS);
  });
});

describe('settleHammock', () => {
  it('catches fish at the base speed over the elapsed time', () => {
    const now = shiftMs(NOON, HOUR_MS);

    const settled = settleHammock(state(), now);

    expect(settled.milliFish).toBe(caught(HOUR_MS));
    expect(settled.settledAt).toEqual(now);
  });

  it("uses today's rod level and otter friend", () => {
    const boosts = { ...NO_BOOSTS, rodLevel: 3, otterFriends: 1 };
    const s = state({
      rodLevel: 3,
      rodLevelDate: TODAY,
      otterFriendUntil: MIDNIGHT,
    });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).milliFish).toBe(caught(HOUR_MS, boosts));
  });

  it('ignores a rod level and otter friend from another day', () => {
    const s = state({
      rodLevel: 5,
      rodLevelDate: YESTERDAY,
      otterFriendUntil: NOON,
    });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).milliFish).toBe(caught(HOUR_MS));
  });

  it('keeps the fractional part for the next settlement', () => {
    const s = state({ milliFish: 1_234 });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).milliFish).toBe(1_234 + caught(HOUR_MS));
  });

  it('stops at the hammock capacity', () => {
    const s = state({ milliFish: BASE_CAPACITY - 10 });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).milliFish).toBe(BASE_CAPACITY);
  });

  it('never removes fish that are already above the capacity', () => {
    const s = state({ milliFish: BASE_CAPACITY + 2_000_000 });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).milliFish).toBe(BASE_CAPACITY + 2_000_000);
  });

  it('switches to the base speed at KST midnight', () => {
    const boosts = { ...NO_BOOSTS, rodLevel: 5 };
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      rodLevel: 5,
      rodLevelDate: TODAY,
    });

    const settled = settleHammock(s, shiftMs(MIDNIGHT, HOUR_MS));

    expect(settled.milliFish).toBe(caught(HOUR_MS, boosts) + caught(HOUR_MS));
  });

  it('fills up to the otter friend capacity, then stops at the smaller base capacity', () => {
    const friendCapacity = hammockCapacityMilliFish(FRIEND_DAY);
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      milliFish: friendCapacity - 10,
      otterFriendUntil: MIDNIGHT,
    });

    expect(settleHammock(s, shiftMs(MIDNIGHT, 3 * HOUR_MS)).milliFish).toBe(friendCapacity);
  });

  it('keeps catching at the base speed after midnight when below the base capacity', () => {
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      otterFriendUntil: MIDNIGHT,
    });

    const settled = settleHammock(s, shiftMs(MIDNIGHT, 2 * HOUR_MS));

    expect(settled.milliFish).toBe(caught(HOUR_MS, FRIEND_DAY) + caught(2 * HOUR_MS));
  });

  it('fills up to the expanded capacity today', () => {
    const expanded = hammockCapacityMilliFish({ ...NO_BOOSTS, hammockLevel: 2 });
    const s = state({ milliFish: BASE_CAPACITY, hammockLevel: 2, hammockLevelDate: TODAY });

    expect(settleHammock(s, shiftMs(NOON, 24 * HOUR_MS)).milliFish).toBe(expanded);
  });

  it('caps at the base capacity after several days away', () => {
    const s = state({ rodLevel: 10, rodLevelDate: TODAY });

    expect(settleHammock(s, shiftMs(NOON, 5 * 24 * HOUR_MS)).milliFish).toBe(BASE_CAPACITY);
  });

  it('returns the state unchanged when no time has passed', () => {
    const s = state({ milliFish: 500 });

    expect(settleHammock(s, NOON)).toBe(s);
    expect(settleHammock(s, shiftMs(NOON, -1))).toBe(s);
  });
});

describe('settleHammock otter friend (24 hours)', () => {
  // KST 2026-11-02 22:00 에 와서 2026-11-03 22:00 에 떠나는 친구
  const ARRIVED = shiftMs(MIDNIGHT, -2 * HOUR_MS);
  const LEAVES = shiftMs(ARRIVED, 24 * HOUR_MS);

  it('keeps the friend after midnight until 24 hours have passed', () => {
    const s = state({ settledAt: ARRIVED, otterFriendUntil: LEAVES });

    expect(boostsAt(s, shiftMs(MIDNIGHT, HOUR_MS)).otterFriends).toBe(1);
    expect(boostsAt(s, LEAVES).otterFriends).toBe(0);
  });

  it('drops the day bonuses at midnight but keeps the friend speed until it leaves', () => {
    const s = state({
      settledAt: ARRIVED,
      otterFriendUntil: LEAVES,
      rodLevel: 10,
      rodLevelDate: TODAY,
    });
    const now = shiftMs(MIDNIGHT, 3 * HOUR_MS);

    const settled = settleHammock(s, now);

    expect(settled.milliFish).toBe(
      caught(2 * HOUR_MS, { ...FRIEND_DAY, rodLevel: 10 }) + caught(3 * HOUR_MS, FRIEND_DAY),
    );
  });

  it('switches to the base speed when the friend leaves', () => {
    const s = state({ settledAt: shiftMs(LEAVES, -HOUR_MS), otterFriendUntil: LEAVES });

    const settled = settleHammock(s, shiftMs(LEAVES, HOUR_MS));

    expect(settled.milliFish).toBe(caught(HOUR_MS, FRIEND_DAY) + caught(HOUR_MS));
  });

  it('predicts the fill time across midnight with the friend still fishing', () => {
    const s = state({ settledAt: ARRIVED, otterFriendUntil: LEAVES });
    const fullAt = predictHammockFullAt(s) as Date;

    expect(fullAt > MIDNIGHT && fullAt < LEAVES).toBe(true);
    expect(settleHammock(s, fullAt).milliFish).toBe(hammockCapacityMilliFish(FRIEND_DAY));
    expect(settleHammock(s, shiftMs(fullAt, -1)).milliFish).toBeLessThan(
      hammockCapacityMilliFish(FRIEND_DAY),
    );
  });
});

describe('predictHammockFullAt', () => {
  it('returns null when the hammock is already full', () => {
    expect(predictHammockFullAt(state({ milliFish: BASE_CAPACITY }))).toBeNull();
  });

  it('predicts the fill time at the base speed', () => {
    const msToFill = Math.ceil(BASE_CAPACITY / milliFishPerMs(100));

    expect(predictHammockFullAt(state())).toEqual(shiftMs(NOON, msToFill));
  });

  it('predicts with today’s boosts when it fills before midnight', () => {
    const boosts = { ...NO_BOOSTS, rodLevel: 4 };
    const s = state({ rodLevel: 4, rodLevelDate: TODAY, milliFish: BASE_CAPACITY / 2 });
    const msToFill = Math.ceil(BASE_CAPACITY / 2 / milliFishPerMs(speedPercent(boosts)));

    expect(predictHammockFullAt(s)).toEqual(shiftMs(NOON, msToFill));
  });

  it('continues at the base speed after midnight', () => {
    const s = state({ settledAt: shiftMs(MIDNIGHT, -HOUR_MS), rodLevel: 2, rodLevelDate: TODAY });
    const atMidnight = caught(HOUR_MS, { ...NO_BOOSTS, rodLevel: 2 });
    const msAfterMidnight = Math.ceil((BASE_CAPACITY - atMidnight) / milliFishPerMs(100));

    expect(predictHammockFullAt(s)).toEqual(shiftMs(MIDNIGHT, msAfterMidnight));
  });

  it('is full when the otter friend leaves and the capacity shrinks below the current fish', () => {
    // 기본 용량과 해달 친구 용량 사이 (친구가 떠나면 넘치는 양)
    const betweenCapacities = (BASE_CAPACITY + hammockCapacityMilliFish(FRIEND_DAY)) / 2;
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -1000),
      milliFish: betweenCapacities,
      otterFriendUntil: MIDNIGHT,
    });

    expect(predictHammockFullAt(s)).toEqual(MIDNIGHT);
  });

  it.each([
    ['no boosts', state()],
    ['rod boost', state({ rodLevel: 7, rodLevelDate: TODAY, milliFish: 123_456 })],
    [
      'otter friend',
      state({
        otterFriendUntil: MIDNIGHT,
        settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      }),
    ],
  ])('agrees with settleHammock (%s)', (_label, s) => {
    const fullAt = predictHammockFullAt(s) as Date;
    const capacityAt = (at: Date) =>
      s.otterFriendUntil !== null && at < s.otterFriendUntil
        ? hammockCapacityMilliFish(FRIEND_DAY)
        : BASE_CAPACITY;

    expect(settleHammock(s, fullAt).milliFish).toBeGreaterThanOrEqual(capacityAt(fullAt));
    const justBefore = shiftMs(fullAt, -1);
    expect(settleHammock(s, justBefore).milliFish).toBeLessThan(capacityAt(justBefore));
  });
});

describe('boostsAt bait', () => {
  it("applies the bait bonus only on the bait's day", () => {
    const s = state({ baitBonusPercent: 5, baitDate: TODAY });

    expect(boostsAt(s, NOON).baitBonusPercent).toBe(5);
    expect(boostsAt(s, shiftMs(NOON, -24 * HOUR_MS)).baitBonusPercent).toBe(0);
  });

  it('drops the bait bonus at KST midnight', () => {
    const settledAtTen = new Date(MIDNIGHT.getTime() - 2 * HOUR_MS);
    const s = state({ settledAt: settledAtTen, baitBonusPercent: 5, baitDate: TODAY });
    const withBait = Math.floor(
      HOUR_MS * milliFishPerMs(speedPercent({ ...NO_BOOSTS, baitBonusPercent: 5 })),
    );
    const plain = Math.floor(HOUR_MS * milliFishPerMs(100));

    const settled = settleHammock(s, new Date(MIDNIGHT.getTime() + HOUR_MS));

    expect(settled.milliFish).toBeCloseTo(2 * withBait + plain, -2);
  });
});

describe('settleHammock overflow', () => {
  it('counts nothing as overflow while the hammock has room', () => {
    const settled = settleHammock(state(), shiftMs(NOON, HOUR_MS));

    expect(settled.overflowMilliFish).toBe(0);
  });

  it('counts the fish that did not fit once the hammock fills up', () => {
    const tenHours = 10 * HOUR_MS;
    const settled = settleHammock(state(), shiftMs(NOON, tenHours));

    expect(settled.milliFish).toBe(BASE_CAPACITY);
    expect(settled.overflowMilliFish).toBe(caught(tenHours) - BASE_CAPACITY);
  });

  it('counts every fish caught while the hammock is already full', () => {
    const s = state({ milliFish: BASE_CAPACITY, overflowMilliFish: 5 });

    const settled = settleHammock(s, shiftMs(NOON, HOUR_MS));

    expect(settled.milliFish).toBe(BASE_CAPACITY);
    expect(settled.overflowMilliFish).toBe(5 + caught(HOUR_MS));
  });

  it('adds the overflow after midnight, when the day bonus is gone', () => {
    const s = state({
      milliFish: BASE_CAPACITY,
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      otterFriendUntil: MIDNIGHT,
    });

    const settled = settleHammock(s, shiftMs(MIDNIGHT, HOUR_MS));

    // 자정 전에는 친구 덕에 용량이 남아 그만큼 담고, 자정 뒤에는 기본 용량을 넘어 있으므로 모두 넘친다
    const roomBeforeMidnight = hammockCapacityMilliFish(FRIEND_DAY) - BASE_CAPACITY;
    const beforeMidnight = caught(HOUR_MS, FRIEND_DAY);
    expect(settled.overflowMilliFish).toBe(
      Math.max(0, beforeMidnight - roomBeforeMidnight) + caught(HOUR_MS),
    );
  });
});
