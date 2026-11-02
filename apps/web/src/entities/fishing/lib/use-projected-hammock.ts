import { useEffect, useState } from 'react';
import type { FishingStatus } from '../model/types';
import { projectHammockFish } from './project-hammock';

const TICK_MS = 1000;

/** 서버 응답을 받은 시각(receivedAt)부터 1초마다 해먹 수량을 늘려 보여준다 */
export function useProjectedHammock(status: FishingStatus, receivedAt: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  // 새 응답을 받은 직후에는 now 가 receivedAt 보다 최대 1초 이를 수 있다
  return projectHammockFish(status, Math.max(now - receivedAt, 0));
}
