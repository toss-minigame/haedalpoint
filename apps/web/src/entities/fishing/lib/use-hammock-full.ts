import { useEffect, useReducer } from 'react';
import type { FishingStatus } from '../model/types';

/** hammockFullAt 을 이 기기 시계 기준 시각(ms)으로. 서버 시각과 기기 시각 차이를 빼고, 이미 가득이면 0 */
function localFullAtMs(status: FishingStatus, receivedAt: number): number {
  if (status.hammockFullAt === null) return 0;
  return receivedAt + (Date.parse(status.hammockFullAt) - Date.parse(status.serverTime));
}

/**
 * 해먹이 지금 가득 찼는지. 다시 조회하지 않아도 가득 차는 시각이 되면 true 로 바뀐다.
 * status 가 없으면(불러오는 중·실패) false.
 */
export function useHammockFull(status: FishingStatus | undefined, receivedAt: number): boolean {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const fullAtMs = status ? localFullAtMs(status, receivedAt) : null;

  useEffect(() => {
    if (fullAtMs === null) return;
    const remainingMs = fullAtMs - Date.now();
    if (remainingMs <= 0) return;
    const timer = setTimeout(rerender, remainingMs);
    return () => clearTimeout(timer);
  }, [fullAtMs]);

  return fullAtMs !== null && Date.now() >= fullAtMs;
}
