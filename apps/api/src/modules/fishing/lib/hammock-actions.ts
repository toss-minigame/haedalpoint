import {
  HAMMOCK_EXPAND_POLICY,
  OTTER_FRIEND_POLICY,
  ROD_POLICY,
} from '../../../common/globals/index.js';
import { MILLI_PER_FISH } from './fishing-rate.js';
import { boostsOn, type HammockState } from './settle-hammock.js';

// 해먹 상태 전환 (순수 함수). 모두 `today` 시점으로 정산이 끝난 상태를 받는다.
// 정산하지 않고 속도를 바꾸면 정산 전 시간까지 새 속도로 계산되므로, 호출하는 쪽에서 먼저 settleHammock 한다.

/** 오늘 낚싯대를 levels 단계 강화한다 (최대 단계에서 멈춤) */
export function enhanceRod(state: HammockState, levels: number, today: string): HammockState {
  const current = boostsOn(state, today).rodLevel;
  return {
    ...state,
    rodLevel: Math.min(ROD_POLICY.MAX_LEVEL, current + levels),
    rodLevelDate: today,
  };
}

/** 오늘 자정까지 해달 친구가 한 명 더 함께 낚시한다 (하루 최대 인원에서 멈춤) */
export function summonOtterFriend(state: HammockState, today: string): HammockState {
  const current = boostsOn(state, today).otterFriends;
  return {
    ...state,
    otterFriendCount: Math.min(OTTER_FRIEND_POLICY.MAX_PER_DAY, current + 1),
    otterFriendDate: today,
  };
}

/** 오늘 해먹을 levels 단계 넓힌다 (최대 단계에서 멈춤) */
export function expandHammock(state: HammockState, levels: number, today: string): HammockState {
  const current = boostsOn(state, today).hammockLevel;
  return {
    ...state,
    hammockLevel: Math.min(HAMMOCK_EXPAND_POLICY.MAX_LEVEL, current + levels),
    hammockLevelDate: today,
  };
}

/** 해먹에서 정수 마리만 꺼낸다. 1마리 미만 소수는 해먹에 남긴다 */
export function takeWholeFish(state: HammockState): { state: HammockState; takenFish: number } {
  const takenFish = Math.floor(state.milliFish / MILLI_PER_FISH);
  return {
    state: { ...state, milliFish: state.milliFish - takenFish * MILLI_PER_FISH },
    takenFish,
  };
}
