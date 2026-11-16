import { HAMMOCK_EXPAND_POLICY, OTTER_FRIEND_POLICY } from '../../../common/globals/index.js';
import { dayBoostsOn, type HammockState, otterFriendsAt } from './settle-hammock.js';

const HOUR_MS = 60 * 60 * 1000;

// 해먹 상태 전환 (순수 함수). 모두 `today` 시점으로 정산이 끝난 상태를 받는다.
// 정산하지 않고 속도를 바꾸면 정산 전 시간까지 새 속도로 계산되므로, 호출하는 쪽에서 먼저 settleHammock 한다.

/** 오늘 낚싯대를 levels 단계 강화한다 (하루 최대 단계 없음) */
export function enhanceRod(state: HammockState, levels: number, today: string): HammockState {
  const current = dayBoostsOn(state, today).rodLevel;
  return {
    ...state,
    rodLevel: current + levels,
    rodLevelDate: today,
  };
}

/**
 * 해달 친구가 한 명 더 와서 정산 시각(settledAt)부터 STAY_HOURS 동안 함께 낚시한다 (최대 인원에서 멈춤).
 * 이미 와 있던 친구도 새 친구와 함께 떠나도록 떠나는 시각을 미룬다.
 */
export function summonOtterFriend(state: HammockState): HammockState {
  const now = state.settledAt;
  const current = otterFriendsAt(state, now);
  return {
    ...state,
    otterFriendCount: Math.min(OTTER_FRIEND_POLICY.MAX_FRIENDS, current + 1),
    otterFriendUntil: new Date(now.getTime() + OTTER_FRIEND_POLICY.STAY_HOURS * HOUR_MS),
  };
}

/** 오늘 해먹을 levels 단계 넓힌다 (최대 단계에서 멈춤) */
export function expandHammock(state: HammockState, levels: number, today: string): HammockState {
  const current = dayBoostsOn(state, today).hammockLevel;
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

/** 해먹을 용량까지 채운다. 더 넣는 양은 maxNanoFish 를 넘지 않고, 넘친 양으로 세지 않는다 */
export function fillHammock(
  state: HammockState,
  capacityNanoFish: number,
  maxNanoFish: number,
): { state: HammockState; addedNanoFish: number } {
  const addedNanoFish = Math.max(0, Math.min(capacityNanoFish - state.nanoFish, maxNanoFish));
  return { state: { ...state, nanoFish: state.nanoFish + addedNanoFish }, addedNanoFish };
}

/** 해먹의 물고기를 소수까지 모두 꺼낸다 */
export function takeAllFish(state: HammockState): { state: HammockState; takenNanoFish: number } {
  return { state: { ...state, nanoFish: 0 }, takenNanoFish: state.nanoFish };
}
