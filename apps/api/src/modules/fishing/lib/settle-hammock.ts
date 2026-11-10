import { nextKstMidnight, toKstDateString } from '../../../common/utils/kst-date.js';
import {
  type Boosts,
  hammockCapacityNanoFish,
  NO_BOOSTS,
  nanoFishPerMs,
  speedPercent,
} from './fishing-rate.js';

// 해먹 정산 (순수 함수). docs/design/fishing.md 3장.
//
// 속도는 (1) 사용자 행동(강화·해달 친구) 직전에 항상 정산하고, (2) KST 자정에 보너스가 풀릴 때만 바뀐다.
// 그래서 정산 구간은 최대 두 개다.
//   settledAt ──[그날 보너스]── 다음 자정 ──[보너스 없음]── now
// 해먹 넓히기·룰렛 미끼도 같은 보너스라 정산 직전에만 바뀐다.

/** 해먹 계산에 필요한 상태 (fishing_states 행의 일부) */
export interface HammockState {
  nanoFish: number;
  settledAt: Date;
  rodLevel: number;
  /** rodLevel 이 유효한 KST 날짜 ('YYYY-MM-DD'). 다른 날이면 0단계 */
  rodLevelDate: string | null;
  /** 해달 친구가 오는 KST 날짜 */
  otterFriendDate: string | null;
  /** otterFriendDate 에 함께 낚시하는 해달 친구 수 */
  otterFriendCount: number;
  /** 광고로 넓힌 해먹 단계 */
  hammockLevel: number;
  /** hammockLevel 이 유효한 KST 날짜. 다른 날이면 0단계 */
  hammockLevelDate: string | null;
  /** 룰렛 미끼로 오른 속도 (%) */
  baitBonusPercent: number;
  /** baitBonusPercent 가 유효한 KST 날짜. 다른 날이면 0% */
  baitDate: string | null;
}

/** `date`(KST) 에 적용되는 보너스 */
export function boostsOn(state: HammockState, date: string): Boosts {
  return {
    rodLevel: state.rodLevelDate === date ? state.rodLevel : 0,
    otterFriends: state.otterFriendDate === date ? state.otterFriendCount : 0,
    hammockLevel: state.hammockLevelDate === date ? state.hammockLevel : 0,
    baitBonusPercent: state.baitDate === date ? state.baitBonusPercent : 0,
  };
}

/** 용량을 넘지 않게 durationMs 동안 잡는다. 이미 용량 이상이면 그대로 둔다 (잡은 물고기는 줄이지 않음) */
function accrue(nanoFish: number, durationMs: number, boosts: Boosts): number {
  const capacity = hammockCapacityNanoFish(boosts);
  if (nanoFish >= capacity) return nanoFish;
  const caught = Math.floor(durationMs * nanoFishPerMs(speedPercent(boosts)));
  return Math.min(capacity, nanoFish + caught);
}

/** 용량까지 남은 시간 (ms). 이미 가득이면 0 */
function msUntilFull(nanoFish: number, boosts: Boosts): number {
  const remaining = hammockCapacityNanoFish(boosts) - nanoFish;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / nanoFishPerMs(speedPercent(boosts)));
}

/** `now` 까지 잡은 물고기를 반영한 새 상태 (settledAt = now) */
export function settleHammock(state: HammockState, now: Date): HammockState {
  const start = state.settledAt.getTime();
  const end = now.getTime();
  if (end <= start) return state;

  const midnight = nextKstMidnight(state.settledAt).getTime();
  const boosts = boostsOn(state, toKstDateString(state.settledAt));

  const untilMidnight = accrue(state.nanoFish, Math.min(end, midnight) - start, boosts);
  const nanoFish =
    end > midnight ? accrue(untilMidnight, end - midnight, NO_BOOSTS) : untilMidnight;

  return { ...state, nanoFish, settledAt: now };
}

/** 정산 직후 상태에서 해먹이 가득 차는 시각. 이미 가득이면 null */
export function predictHammockFullAt(state: HammockState): Date | null {
  const start = state.settledAt.getTime();
  const midnight = nextKstMidnight(state.settledAt).getTime();
  const boosts = boostsOn(state, toKstDateString(state.settledAt));

  const msToFill = msUntilFull(state.nanoFish, boosts);
  if (msToFill === 0) return null;
  if (start + msToFill <= midnight) return new Date(start + msToFill);

  const atMidnight = accrue(state.nanoFish, midnight - start, boosts);
  return new Date(midnight + msUntilFull(atMidnight, NO_BOOSTS));
}
