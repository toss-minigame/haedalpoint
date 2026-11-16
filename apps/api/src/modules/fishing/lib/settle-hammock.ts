import { nextKstMidnight, toKstDateString } from '../../../common/utils/kst-date.js';
import {
  type Boosts,
  hammockCapacityMilliFish,
  milliFishPerMs,
  speedPercent,
} from './fishing-rate.js';

// 해먹 정산 (순수 함수). docs/design/fishing.md 3장.
//
// 속도·용량은 (1) 사용자 행동(강화·해달 친구·해먹 넓히기·룰렛 미끼) 직전에 항상 정산하고,
// (2) KST 자정에 하루 보너스(강화·해먹 넓히기·미끼)가 풀릴 때, (3) 해달 친구가 떠날 때(온 지 24시간)만 바뀐다.
// 하루 보너스는 마지막 정산 날짜에만 붙으므로, 정산 구간은 "다음 자정"과 "해달 친구가 떠나는 시각"으로만 나뉜다 (최대 세 구간).
//   settledAt ──[그날 보너스 + 친구]── 자정 ──[친구만]── 친구 떠남 ──[보너스 없음]── now
// (친구가 자정 전에 떠나면 두 경계의 순서가 바뀐다)

/** 해먹 계산에 필요한 상태 (fishing_states 행의 일부) */
export interface HammockState {
  milliFish: number;
  settledAt: Date;
  rodLevel: number;
  /** rodLevel 이 유효한 KST 날짜 ('YYYY-MM-DD'). 다른 날이면 0단계 */
  rodLevelDate: string | null;
  /** 해달 친구가 떠나는 시각. 이 시각 전까지 함께 낚시한다 */
  otterFriendUntil: Date | null;
  /** 광고로 넓힌 해먹 단계 */
  hammockLevel: number;
  /** hammockLevel 이 유효한 KST 날짜. 다른 날이면 0단계 */
  hammockLevelDate: string | null;
  /** 룰렛 미끼로 오른 속도 (%) */
  baitBonusPercent: number;
  /** baitBonusPercent 가 유효한 KST 날짜. 다른 날이면 0% */
  baitDate: string | null;
  /** 마지막 저장 이후 해먹이 가득 차서 버려진 물고기 (서버만 안다. 다시 잡아오기 양 계산에 쓴다) */
  overflowMilliFish: number;
}

/** `at` 시각에 적용되는 보너스 */
export function boostsAt(state: HammockState, at: Date): Boosts {
  const date = toKstDateString(at);
  const friendHere = state.otterFriendUntil !== null && at < state.otterFriendUntil;
  return {
    rodLevel: state.rodLevelDate === date ? state.rodLevel : 0,
    otterFriends: friendHere ? 1 : 0,
    hammockLevel: state.hammockLevelDate === date ? state.hammockLevel : 0,
    baitBonusPercent: state.baitDate === date ? state.baitBonusPercent : 0,
  };
}

/** start 이후 보너스가 바뀌는 시각들 (오름차순): 다음 자정, 해달 친구가 떠나는 시각 */
function boostChangesAfter(state: HammockState, start: number): number[] {
  const changes = [nextKstMidnight(new Date(start)).getTime()];
  const friendLeaves = state.otterFriendUntil?.getTime();
  if (friendLeaves !== undefined && friendLeaves > start) changes.push(friendLeaves);
  return [...new Set(changes)].sort((a, b) => a - b);
}

interface Accrued {
  milliFish: number;
  /** 해먹이 가득 차서 담지 못하고 버린 양 */
  overflow: number;
}

/**
 * 용량을 넘지 않게 durationMs 동안 잡는다. 이미 용량 이상이면 그대로 둔다 (잡은 물고기는 줄이지 않음).
 * 용량을 넘어 담지 못한 양은 overflow 로 돌려준다.
 */
function accrue(milliFish: number, durationMs: number, boosts: Boosts): Accrued {
  const capacity = hammockCapacityMilliFish(boosts);
  const caught = Math.floor(durationMs * milliFishPerMs(speedPercent(boosts)));
  if (milliFish >= capacity) return { milliFish, overflow: caught };
  const total = milliFish + caught;
  return total > capacity
    ? { milliFish: capacity, overflow: total - capacity }
    : { milliFish: total, overflow: 0 };
}

/** 용량까지 남은 시간 (ms). 이미 가득이면 0 */
function msUntilFull(milliFish: number, boosts: Boosts): number {
  const remaining = hammockCapacityMilliFish(boosts) - milliFish;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / milliFishPerMs(speedPercent(boosts)));
}

/** `now` 까지 잡은 물고기를 반영한 새 상태 (settledAt = now) */
export function settleHammock(state: HammockState, now: Date): HammockState {
  const start = state.settledAt.getTime();
  const end = now.getTime();
  if (end <= start) return state;

  const bounds = [start, ...boostChangesAfter(state, start).filter((t) => t < end), end];
  let milliFish = state.milliFish;
  let overflow = state.overflowMilliFish;
  for (let i = 0; i < bounds.length - 1; i++) {
    const boosts = boostsAt(state, new Date(bounds[i]));
    const accrued = accrue(milliFish, bounds[i + 1] - bounds[i], boosts);
    milliFish = accrued.milliFish;
    overflow += accrued.overflow;
  }
  return { ...state, milliFish, overflowMilliFish: overflow, settledAt: now };
}

/** 정산 직후 상태에서 해먹이 가득 차는 시각. 이미 가득이면 null */
export function predictHammockFullAt(state: HammockState): Date | null {
  const start = state.settledAt.getTime();
  if (msUntilFull(state.milliFish, boostsAt(state, state.settledAt)) === 0) return null;

  // 마지막 경계 이후로는 보너스가 바뀌지 않는다
  const bounds = [start, ...boostChangesAfter(state, start)];
  let milliFish = state.milliFish;
  for (const [i, segmentStart] of bounds.entries()) {
    const boosts = boostsAt(state, new Date(segmentStart));
    const msToFill = msUntilFull(milliFish, boosts);
    const segmentEnd = bounds[i + 1];
    if (segmentEnd === undefined || segmentStart + msToFill <= segmentEnd) {
      return new Date(segmentStart + msToFill);
    }
    milliFish = accrue(milliFish, segmentEnd - segmentStart, boosts).milliFish;
  }
  return null;
}
