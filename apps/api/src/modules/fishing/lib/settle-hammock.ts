import { nextKstMidnight, toKstDateString } from '../../../common/utils/kst-date.js';
import {
  type Boosts,
  hammockCapacityNanoFish,
  NO_BOOSTS,
  nanoFishPerMs,
  speedPercent,
} from './fishing-rate.js';

// 해먹 정산 (순수 함수). docs/design/fishing.md 3장, docs/design/tutorial.md 5장.
//
// 속도는 (1) 사용자 행동(강화·해달 친구) 직전에 항상 정산하고, (2) KST 자정에 하루 보너스가 풀릴 때,
// (3) 해달 친구가 떠날 때만 바뀐다. 그래서 정산 구간은 최대 세 개다.
//   settledAt ──[그날 보너스 + 친구]── (자정 또는 친구 떠남) ──[…]── (나머지 하나) ──[…]── now
// 해먹 넓히기·룰렛 미끼도 하루 보너스라 정산 직전에만 바뀐다.
// 친구는 최대 24시간 머물러 settledAt 뒤로 자정을 두 번 넘겨 남아 있을 수 없다.

/** 해먹 계산에 필요한 상태 (fishing_states 행의 일부) */
export interface HammockState {
  nanoFish: number;
  settledAt: Date;
  rodLevel: number;
  /** rodLevel 이 유효한 KST 날짜 ('YYYY-MM-DD'). 다른 날이면 0단계 */
  rodLevelDate: string | null;
  /** 해달 친구가 떠나는 시각. 이 시각 전까지 otterFriendCount 명이 함께 낚시한다 */
  otterFriendUntil: Date | null;
  otterFriendCount: number;
  /** 광고로 넓힌 해먹 단계 */
  hammockLevel: number;
  /** hammockLevel 이 유효한 KST 날짜. 다른 날이면 0단계 */
  hammockLevelDate: string | null;
  /** 룰렛 미끼로 오른 속도 (%) */
  baitBonusPercent: number;
  /** baitBonusPercent 가 유효한 KST 날짜. 다른 날이면 0% */
  baitDate: string | null;
  /** 마지막 저장 이후 해먹이 가득 차서 버려진 물고기 (서버만 안다. 다시 잡아오기 양 계산에 쓴다) */
  overflowNanoFish: number;
}

/** `date`(KST) 하루 동안 적용되는 보너스 (낚싯대·해먹·미끼). 해달 친구는 날짜와 상관없어 0이다 */
export function dayBoostsOn(state: HammockState, date: string): Boosts {
  return {
    rodLevel: state.rodLevelDate === date ? state.rodLevel : 0,
    otterFriends: 0,
    hammockLevel: state.hammockLevelDate === date ? state.hammockLevel : 0,
    baitBonusPercent: state.baitDate === date ? state.baitBonusPercent : 0,
  };
}

/** `at` 에 함께 낚시하는 해달 친구 수 */
export function otterFriendsAt(state: HammockState, at: Date): number {
  const until = state.otterFriendUntil;
  return until && until.getTime() > at.getTime() ? state.otterFriendCount : 0;
}

/** `at` 에 적용되는 보너스 */
export function boostsAt(state: HammockState, at: Date): Boosts {
  return {
    ...dayBoostsOn(state, toKstDateString(at)),
    otterFriends: otterFriendsAt(state, at),
  };
}

interface Accrued {
  nanoFish: number;
  /** 해먹이 가득 차서 담지 못하고 버린 양 */
  overflow: number;
}

/**
 * 용량을 넘지 않게 durationMs 동안 잡는다. 이미 용량 이상이면 그대로 둔다 (잡은 물고기는 줄이지 않음).
 * 용량을 넘어 담지 못한 양은 overflow 로 돌려준다.
 */
function accrue(nanoFish: number, durationMs: number, boosts: Boosts): Accrued {
  const capacity = hammockCapacityNanoFish(boosts);
  const caught = Math.floor(durationMs * nanoFishPerMs(speedPercent(boosts)));
  if (nanoFish >= capacity) return { nanoFish, overflow: caught };
  const total = nanoFish + caught;
  return total > capacity
    ? { nanoFish: capacity, overflow: total - capacity }
    : { nanoFish: total, overflow: 0 };
}

/** 용량까지 남은 시간 (ms). 이미 가득이면 0 */
function msUntilFull(nanoFish: number, boosts: Boosts): number {
  const remaining = hammockCapacityNanoFish(boosts) - nanoFish;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / nanoFishPerMs(speedPercent(boosts)));
}

/** settledAt 이후 속도가 바뀌는 시각 (다음 자정, 친구가 떠나는 시각), 오름차순 (ms) */
function boostChangeTimes(state: HammockState): number[] {
  const start = state.settledAt.getTime();
  const midnight = nextKstMidnight(state.settledAt).getTime();
  const friendLeaves = state.otterFriendUntil?.getTime();
  const times =
    friendLeaves !== undefined && friendLeaves !== midnight ? [midnight, friendLeaves] : [midnight];
  return times.filter((time) => time > start).sort((a, b) => a - b);
}

/** settledAt 이후 `atMs` 에 적용되는 보너스. 하루 보너스는 settledAt 과 같은 날(자정 전)에만 붙는다 */
function boostsSince(state: HammockState, atMs: number): Boosts {
  const midnight = nextKstMidnight(state.settledAt).getTime();
  const day = atMs < midnight ? dayBoostsOn(state, toKstDateString(state.settledAt)) : NO_BOOSTS;
  return { ...day, otterFriends: otterFriendsAt(state, new Date(atMs)) };
}

/** `now` 까지 잡은 물고기를 반영한 새 상태 (settledAt = now) */
export function settleHammock(state: HammockState, now: Date): HammockState {
  const start = state.settledAt.getTime();
  const end = now.getTime();
  if (end <= start) return state;

  const bounds = [start, ...boostChangeTimes(state).filter((time) => time < end), end];
  const settled = bounds.slice(1).reduce<Accrued>(
    (acc, to, index) => {
      const from = bounds[index] as number;
      const accrued = accrue(acc.nanoFish, to - from, boostsSince(state, from));
      return { nanoFish: accrued.nanoFish, overflow: acc.overflow + accrued.overflow };
    },
    { nanoFish: state.nanoFish, overflow: state.overflowNanoFish },
  );

  return {
    ...state,
    nanoFish: settled.nanoFish,
    overflowNanoFish: settled.overflow,
    settledAt: now,
  };
}

/** 정산 직후 상태에서 해먹이 가득 차는 시각. 이미 가득이면 null */
export function predictHammockFullAt(state: HammockState): Date | null {
  const start = state.settledAt.getTime();
  if (msUntilFull(state.nanoFish, boostsSince(state, start)) === 0) return null;

  const bounds = [start, ...boostChangeTimes(state)];
  let nanoFish = state.nanoFish;
  for (const [index, from] of bounds.entries()) {
    const boosts = boostsSince(state, from);
    const msToFill = msUntilFull(nanoFish, boosts);
    const to = bounds[index + 1];
    if (to === undefined || from + msToFill <= to) return new Date(from + msToFill);
    nanoFish = accrue(nanoFish, to - from, boosts).nanoFish;
  }
  return null;
}
