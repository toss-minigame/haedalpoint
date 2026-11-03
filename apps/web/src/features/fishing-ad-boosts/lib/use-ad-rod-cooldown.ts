import { useEffect, useState } from 'react';
import type { FishingStatus } from '@/entities/fishing';

const TICK_MS = 1000;

/**
 * 광고 강화 쿨타임이 끝날 때까지 남은 시간 (ms, 끝났으면 0).
 * 기기 시계가 서버와 달라도 맞도록 응답의 serverTime 기준으로 계산하고, 응답을 받은 뒤 흐른 시간을 뺀다.
 */
export function useAdRodCooldown(status: FishingStatus, receivedAt: number): number {
  const { adRodEnhanceAvailableAt, serverTime } = status;
  const [now, setNow] = useState(() => Date.now());

  const remainingAtResponse = adRodEnhanceAvailableAt
    ? Date.parse(adRodEnhanceAvailableAt) - Date.parse(serverTime)
    : 0;
  const remainingMs = Math.max(remainingAtResponse - Math.max(now - receivedAt, 0), 0);
  const isCoolingDown = remainingMs > 0;

  // 쿨타임 중일 때만 1초마다 다시 계산한다
  useEffect(() => {
    if (!isCoolingDown) return;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [isCoolingDown]);

  return remainingMs;
}
