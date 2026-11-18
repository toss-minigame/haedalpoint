import { HAMMOCK_EXPAND_POLICY, OTTER_FRIEND_POLICY } from '../../../common/globals/index.js';
import type { HammockState } from './settle-hammock.js';

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** 날짜가 오늘인 하루 보너스의 값. 다른 날이면 0 */
function todayValue(value: number, date: string | null, today: string): number {
  return date === today ? value : 0;
}

// 해먹 상태 전환 (순수 함수). 모두 `today` 시점으로 정산이 끝난 상태를 받는다.
// 정산하지 않고 속도를 바꾸면 정산 전 시간까지 새 속도로 계산되므로, 호출하는 쪽에서 먼저 settleHammock 한다.

/** 오늘 낚싯대를 levels 단계 강화한다 (하루 최대 단계 없음) */
export function enhanceRod(state: HammockState, levels: number, today: string): HammockState {
  const current = todayValue(state.rodLevel, state.rodLevelDate, today);
  return {
    ...state,
    rodLevel: current + levels,
    rodLevelDate: today,
  };
}

/**
 * 해달 친구가 `now` 부터 DURATION_HOURS 동안 함께 낚시한다 (한 번에 한 명).
 * 이미 와 있으면 더 늦게 떠나는 쪽으로 맞춘다 (머무는 시간이 줄지 않는다).
 */
export function summonOtterFriend(state: HammockState, now: Date): HammockState {
  const leavesAt = now.getTime() + OTTER_FRIEND_POLICY.DURATION_HOURS * HOUR_MS;
  const current = state.otterFriendUntil?.getTime() ?? 0;
  return { ...state, otterFriendUntil: new Date(Math.max(current, leavesAt)) };
}

/** 해달 친구가 녹기 시작하는 시각 (떠나는 시각 − MELT_MINUTES). 친구가 온 적이 없으면 null */
export function otterFriendMeltsAt(state: HammockState): Date | null {
  if (!state.otterFriendUntil) return null;
  return new Date(state.otterFriendUntil.getTime() - OTTER_FRIEND_POLICY.MELT_MINUTES * MINUTE_MS);
}

/** 해달 친구가 `now` 에 녹는 중인지: 아직 떠나지 않았고, 떠나기 MELT_MINUTES 전을 지났다 */
export function isOtterFriendMelting(state: HammockState, now: Date): boolean {
  const meltsAt = otterFriendMeltsAt(state);
  return (
    meltsAt !== null &&
    state.otterFriendUntil !== null &&
    now >= meltsAt &&
    now < state.otterFriendUntil
  );
}

/**
 * 녹고 있는 해달 친구를 얼려 FREEZE_HOURS 더 머물게 한다.
 * 녹는 중인지·이미 얼렸는지는 호출하는 쪽에서 확인한다 (isOtterFriendMelting, otter_friend_frozen).
 */
export function freezeOtterFriend(state: HammockState): HammockState {
  if (!state.otterFriendUntil) return state;
  const leavesAt = state.otterFriendUntil.getTime() + OTTER_FRIEND_POLICY.FREEZE_HOURS * HOUR_MS;
  return { ...state, otterFriendUntil: new Date(leavesAt) };
}

/** 오늘 해먹을 levels 단계 넓힌다 (최대 단계에서 멈춤) */
export function expandHammock(state: HammockState, levels: number, today: string): HammockState {
  const current = todayValue(state.hammockLevel, state.hammockLevelDate, today);
  return {
    ...state,
    hammockLevel: Math.min(HAMMOCK_EXPAND_POLICY.MAX_LEVEL, current + levels),
    hammockLevelDate: today,
  };
}

/** 오늘 자정까지 룰렛 미끼 효과를 적용한다 (하루 한 번, 같은 날 다시 적용하면 덮어쓴다) */
export function applyBait(
  state: HammockState,
  speedBonusPercent: number,
  today: string,
): HammockState {
  return { ...state, baitBonusPercent: speedBonusPercent, baitDate: today };
}

/**
 * 해먹을 capacityMilliFish 까지 채운다 (더 넣는 양은 maxMilliFish 까지). 튜토리얼 첫 선물.
 * 넘친 양으로 세지 않는다. 이미 용량 이상이면 그대로 둔다.
 */
export function fillHammock(
  state: HammockState,
  capacityMilliFish: number,
  maxMilliFish: number,
): { state: HammockState; addedMilliFish: number } {
  const addedMilliFish = Math.max(0, Math.min(capacityMilliFish - state.milliFish, maxMilliFish));
  return { state: { ...state, milliFish: state.milliFish + addedMilliFish }, addedMilliFish };
}

/** 해먹의 물고기를 모두 꺼낸다 */
export function takeAllFish(state: HammockState): { state: HammockState; takenMilliFish: number } {
  return { state: { ...state, milliFish: 0 }, takenMilliFish: state.milliFish };
}
