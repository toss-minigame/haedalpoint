import { nextKstMidnight, toKstDateString } from '../../../common/utils/kst-date.js';
import {
  type Boosts,
  hammockCapacityMilliFish,
  milliFishPerMs,
  NO_BOOSTS,
  speedPercent,
} from './fishing-rate.js';

// 해먹 정산 (순수 함수). docs/design/fishing.md 3장.
//
// 속도는 (1) 사용자 행동(강화·해달 친구) 직전에 항상 정산하고, (2) KST 자정에 보너스가 풀릴 때만 바뀐다.
// 그래서 정산 구간은 최대 두 개다.
//   settledAt ──[그날 보너스]── 다음 자정 ──[보너스 없음]── now

/** 해먹 계산에 필요한 상태 (fishing_states 행의 일부) */
export interface HammockState {
  milliFish: number;
  settledAt: Date;
  rodLevel: number;
  /** rodLevel 이 유효한 KST 날짜 ('YYYY-MM-DD'). 다른 날이면 0단계 */
  rodLevelDate: string | null;
  /** 해달 친구가 오는 KST 날짜 */
  otterFriendDate: string | null;
}

/** `date`(KST) 에 적용되는 보너스 */
export function boostsOn(state: HammockState, date: string): Boosts {
  return {
    rodLevel: state.rodLevelDate === date ? state.rodLevel : 0,
    otterFriend: state.otterFriendDate === date,
  };
}

/** 용량을 넘지 않게 durationMs 동안 잡는다. 이미 용량 이상이면 그대로 둔다 (잡은 물고기는 줄이지 않음) */
function accrue(milliFish: number, durationMs: number, boosts: Boosts): number {
  const capacity = hammockCapacityMilliFish(boosts);
  if (milliFish >= capacity) return milliFish;
  const caught = Math.floor(durationMs * milliFishPerMs(speedPercent(boosts)));
  return Math.min(capacity, milliFish + caught);
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

  const midnight = nextKstMidnight(state.settledAt).getTime();
  const boosts = boostsOn(state, toKstDateString(state.settledAt));

  const untilMidnight = accrue(state.milliFish, Math.min(end, midnight) - start, boosts);
  const milliFish =
    end > midnight ? accrue(untilMidnight, end - midnight, NO_BOOSTS) : untilMidnight;

  return { ...state, milliFish, settledAt: now };
}

/** 정산 직후 상태에서 해먹이 가득 차는 시각. 이미 가득이면 null */
export function predictHammockFullAt(state: HammockState): Date | null {
  const start = state.settledAt.getTime();
  const midnight = nextKstMidnight(state.settledAt).getTime();
  const boosts = boostsOn(state, toKstDateString(state.settledAt));

  const msToFill = msUntilFull(state.milliFish, boosts);
  if (msToFill === 0) return null;
  if (start + msToFill <= midnight) return new Date(start + msToFill);

  const atMidnight = accrue(state.milliFish, midnight - start, boosts);
  return new Date(midnight + msUntilFull(atMidnight, NO_BOOSTS));
}
