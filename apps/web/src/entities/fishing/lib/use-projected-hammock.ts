import { useEffect, useState } from 'react';
import type { FishingStatus } from '../model/types';
import { projectHammockFish } from './project-hammock';

const TICK_MS = 1000;

/** 서버 응답을 받은 시각(receivedAt)부터 1초마다 해먹 수량을 늘려 보여준다 */
export function useProjectedHammock(status: FishingStatus, receivedAt: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const elapsedMs = now - receivedAt;
  const fish = projectHammockFish(status, elapsedMs);
  const msUntilFull = status.hammockFullAt
    ? Date.parse(status.hammockFullAt) - Date.parse(status.serverTime) - elapsedMs
    : 0;

  return { fish, isFull: fish >= status.hammockCapacity, msUntilFull: Math.max(msUntilFull, 0) };
}
