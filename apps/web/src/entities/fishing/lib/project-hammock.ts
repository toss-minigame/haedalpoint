import type { FishingStatus } from '../model/types';

const HOUR_MS = 60 * 60 * 1000;

/**
 * 응답을 받은 뒤 elapsedMs 가 지났을 때 해먹에 있을 물고기 (화면 표시용 추정값).
 * 실제 수량은 서버가 계산한다. 자정(boostsResetAt) 이후는 속도가 바뀌므로 그 전까지만 늘리고,
 * 다음 조회에서 서버 값으로 맞춘다.
 */
export function projectHammockFish(status: FishingStatus, elapsedMs: number): number {
  const { hammockFish, hammockCapacity, fishPerHour } = status;
  if (hammockFish >= hammockCapacity) return hammockFish;

  const untilReset = Date.parse(status.boostsResetAt) - Date.parse(status.serverTime);
  const effectiveMs = Math.min(Math.max(elapsedMs, 0), Math.max(untilReset, 0));
  return Math.min(hammockCapacity, hammockFish + (effectiveMs / HOUR_MS) * fishPerHour);
}
