import { FISHING_POLICY } from '../../../common/globals/index.js';
import {
  type Boosts,
  hammockCapacityNanoFish,
  NANO_PER_FISH,
  NO_BOOSTS,
  nanoFishPerMs,
  speedPercent,
} from '../lib/fishing-rate.js';
import {
  boostsOn,
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

const BASE_CAPACITY = Math.round(FISHING_POLICY.HAMMOCK_CAPACITY * NANO_PER_FISH);
const FRIEND_DAY: Boosts = { ...NO_BOOSTS, otterFriends: 1 };

function state(overrides: Partial<HammockState> = {}): HammockState {
  return {
    nanoFish: 0,
    settledAt: NOON,
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

function caught(durationMs: number, boosts: Boosts = NO_BOOSTS): number {
  return Math.floor(durationMs * nanoFishPerMs(speedPercent(boosts)));
}

function shiftMs(at: Date, ms: number): Date {
  return new Date(at.getTime() + ms);
}

describe('boostsOn', () => {
  it('applies the rod level and otter friend only on their own date', () => {
    const s = state({
      rodLevel: 3,
      rodLevelDate: TODAY,
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });

    expect(boostsOn(s, TODAY)).toEqual({
      rodLevel: 3,
      otterFriends: 1,
      hammockLevel: 0,
      baitBonusPercent: 0,
    });
    expect(boostsOn(s, '2026-11-03')).toEqual(NO_BOOSTS);
  });

  it('counts the otter friends and the expanded hammock only on their own date', () => {
    const s = state({
      otterFriendDate: TODAY,
      otterFriendCount: 2,
      hammockLevel: 3,
      hammockLevelDate: TODAY,
    });

    expect(boostsOn(s, TODAY)).toEqual({
      rodLevel: 0,
      otterFriends: 2,
      hammockLevel: 3,
      baitBonusPercent: 0,
    });
    expect(boostsOn(s, '2026-11-03')).toEqual(NO_BOOSTS);
  });
});

describe('settleHammock', () => {
  it('catches fish at the base speed over the elapsed time', () => {
    const now = shiftMs(NOON, HOUR_MS);

    const settled = settleHammock(state(), now);

    expect(settled.nanoFish).toBe(caught(HOUR_MS));
    expect(settled.settledAt).toEqual(now);
  });

  it("uses today's rod level and otter friend", () => {
    const boosts = { ...NO_BOOSTS, rodLevel: 3, otterFriends: 1 };
    const s = state({
      rodLevel: 3,
      rodLevelDate: TODAY,
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).nanoFish).toBe(caught(HOUR_MS, boosts));
  });

  it('ignores a rod level and otter friend from another day', () => {
    const s = state({
      rodLevel: 5,
      rodLevelDate: YESTERDAY,
      otterFriendDate: YESTERDAY,
      otterFriendCount: 1,
    });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).nanoFish).toBe(caught(HOUR_MS));
  });

  it('keeps the fractional part for the next settlement', () => {
    const s = state({ nanoFish: 1_234 });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).nanoFish).toBe(1_234 + caught(HOUR_MS));
  });

  it('stops at the hammock capacity', () => {
    const s = state({ nanoFish: BASE_CAPACITY - 10 });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).nanoFish).toBe(BASE_CAPACITY);
  });

  it('never removes fish that are already above the capacity', () => {
    const s = state({ nanoFish: BASE_CAPACITY + 2_000_000 });

    expect(settleHammock(s, shiftMs(NOON, HOUR_MS)).nanoFish).toBe(BASE_CAPACITY + 2_000_000);
  });

  it('switches to the base speed at KST midnight', () => {
    const boosts = { ...NO_BOOSTS, rodLevel: 5 };
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      rodLevel: 5,
      rodLevelDate: TODAY,
    });

    const settled = settleHammock(s, shiftMs(MIDNIGHT, HOUR_MS));

    expect(settled.nanoFish).toBe(caught(HOUR_MS, boosts) + caught(HOUR_MS));
  });

  it('fills up to the otter friend capacity, then stops at the smaller base capacity', () => {
    const friendCapacity = hammockCapacityNanoFish(FRIEND_DAY);
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      nanoFish: friendCapacity - 10,
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });

    expect(settleHammock(s, shiftMs(MIDNIGHT, 3 * HOUR_MS)).nanoFish).toBe(friendCapacity);
  });

  it('keeps catching at the base speed after midnight when below the base capacity', () => {
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });

    const settled = settleHammock(s, shiftMs(MIDNIGHT, 2 * HOUR_MS));

    expect(settled.nanoFish).toBe(caught(HOUR_MS, FRIEND_DAY) + caught(2 * HOUR_MS));
  });

  it('fills up to the expanded capacity today', () => {
    const expanded = hammockCapacityNanoFish({ ...NO_BOOSTS, hammockLevel: 2 });
    const s = state({ nanoFish: BASE_CAPACITY, hammockLevel: 2, hammockLevelDate: TODAY });

    expect(settleHammock(s, shiftMs(NOON, 24 * HOUR_MS)).nanoFish).toBe(expanded);
  });

  it('caps at the base capacity after several days away', () => {
    const s = state({ rodLevel: 10, rodLevelDate: TODAY });

    expect(settleHammock(s, shiftMs(NOON, 5 * 24 * HOUR_MS)).nanoFish).toBe(BASE_CAPACITY);
  });

  it('returns the state unchanged when no time has passed', () => {
    const s = state({ nanoFish: 500 });

    expect(settleHammock(s, NOON)).toBe(s);
    expect(settleHammock(s, shiftMs(NOON, -1))).toBe(s);
  });
});

describe('predictHammockFullAt', () => {
  it('returns null when the hammock is already full', () => {
    expect(predictHammockFullAt(state({ nanoFish: BASE_CAPACITY }))).toBeNull();
  });

  it('predicts the fill time at the base speed', () => {
    const msToFill = Math.ceil(BASE_CAPACITY / nanoFishPerMs(100));

    expect(predictHammockFullAt(state())).toEqual(shiftMs(NOON, msToFill));
  });

  it('predicts with today’s boosts when it fills before midnight', () => {
    const boosts = { ...NO_BOOSTS, rodLevel: 4 };
    const s = state({ rodLevel: 4, rodLevelDate: TODAY, nanoFish: BASE_CAPACITY / 2 });
    const msToFill = Math.ceil(BASE_CAPACITY / 2 / nanoFishPerMs(speedPercent(boosts)));

    expect(predictHammockFullAt(s)).toEqual(shiftMs(NOON, msToFill));
  });

  it('continues at the base speed after midnight', () => {
    const s = state({ settledAt: shiftMs(MIDNIGHT, -HOUR_MS), rodLevel: 2, rodLevelDate: TODAY });
    const atMidnight = caught(HOUR_MS, { ...NO_BOOSTS, rodLevel: 2 });
    const msAfterMidnight = Math.ceil((BASE_CAPACITY - atMidnight) / nanoFishPerMs(100));

    expect(predictHammockFullAt(s)).toEqual(shiftMs(MIDNIGHT, msAfterMidnight));
  });

  it('is full at midnight when the otter friend capacity shrinks below the current fish', () => {
    // 기본 용량과 해달 친구 용량 사이 (친구가 떠나면 넘치는 양)
    const betweenCapacities = (BASE_CAPACITY + hammockCapacityNanoFish(FRIEND_DAY)) / 2;
    const s = state({
      settledAt: shiftMs(MIDNIGHT, -1000),
      nanoFish: betweenCapacities,
      otterFriendDate: TODAY,
      otterFriendCount: 1,
    });

    expect(predictHammockFullAt(s)).toEqual(MIDNIGHT);
  });

  it.each([
    ['no boosts', state()],
    ['rod boost', state({ rodLevel: 7, rodLevelDate: TODAY, nanoFish: 123_456 })],
    [
      'otter friend',
      state({
        otterFriendDate: TODAY,
        otterFriendCount: 1,
        settledAt: shiftMs(MIDNIGHT, -HOUR_MS),
      }),
    ],
  ])('agrees with settleHammock (%s)', (_label, s) => {
    const fullAt = predictHammockFullAt(s) as Date;
    const capacityAt = (at: Date) =>
      at < MIDNIGHT && s.otterFriendDate === TODAY
        ? hammockCapacityNanoFish(FRIEND_DAY)
        : BASE_CAPACITY;

    expect(settleHammock(s, fullAt).nanoFish).toBeGreaterThanOrEqual(capacityAt(fullAt));
    const justBefore = shiftMs(fullAt, -1);
    expect(settleHammock(s, justBefore).nanoFish).toBeLessThan(capacityAt(justBefore));
  });
});

describe('boostsOn bait', () => {
  it("applies the bait bonus only on the bait's day", () => {
    const s = state({ baitBonusPercent: 5, baitDate: TODAY });

    expect(boostsOn(s, TODAY).baitBonusPercent).toBe(5);
    expect(boostsOn(s, YESTERDAY).baitBonusPercent).toBe(0);
  });

  it('drops the bait bonus at KST midnight', () => {
    const settledAtTen = new Date(MIDNIGHT.getTime() - 2 * HOUR_MS);
    const s = state({ settledAt: settledAtTen, baitBonusPercent: 5, baitDate: TODAY });
    const withBait = Math.floor(
      HOUR_MS * nanoFishPerMs(speedPercent({ ...NO_BOOSTS, baitBonusPercent: 5 })),
    );
    const plain = Math.floor(HOUR_MS * nanoFishPerMs(100));

    const settled = settleHammock(s, new Date(MIDNIGHT.getTime() + HOUR_MS));

    expect(settled.nanoFish).toBeCloseTo(2 * withBait + plain, -2);
  });
});
