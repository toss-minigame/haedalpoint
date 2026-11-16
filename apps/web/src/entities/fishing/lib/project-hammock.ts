import type { FishingStatus } from '../model/types';

const HOUR_MS = 60 * 60 * 1000;

/** 지금 속도가 바뀌는 가장 이른 시각까지 남은 시간. 자정(boostsResetAt) 또는 해달 친구가 떠나는 시각(otterFriendUntil) */
function msUntilSpeedChange(status: FishingStatus): number {
  const serverTime = Date.parse(status.serverTime);
  const untilReset = Date.parse(status.boostsResetAt) - serverTime;
  if (status.otterFriendUntil === null) return untilReset;
  return Math.min(untilReset, Date.parse(status.otterFriendUntil) - serverTime);
}

/**
 * 응답을 받은 뒤 elapsedMs 가 지났을 때 해먹에 있을 물고기 (화면 표시용 추정값, 화면에는 정수로 내림해 보여준다).
 * 실제 수량은 서버가 계산한다. 자정이나 해달 친구가 떠난 뒤에는 속도가 바뀌므로 그 전까지만 늘리고,
 * 다음 조회에서 서버 값으로 맞춘다.
 */
export function projectHammockFish(status: FishingStatus, elapsedMs: number): number {
  const { hammockFish, hammockCapacity, fishPerHour } = status;
  if (hammockFish >= hammockCapacity) return hammockFish;

  const effectiveMs = Math.min(Math.max(elapsedMs, 0), Math.max(msUntilSpeedChange(status), 0));
  return Math.min(hammockCapacity, hammockFish + (effectiveMs / HOUR_MS) * fishPerHour);
}
