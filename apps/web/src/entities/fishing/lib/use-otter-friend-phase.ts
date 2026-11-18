import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fishingQueries } from '../api/fishing-queries';
import type { FishingStatus } from '../model/types';
import { type OtterFriendPhase, otterFriendPhaseAt, toLocalMs } from './otter-friend-phase';

export type { OtterFriendPhase };

/** 친구(눈사람)가 와 있는 동안 녹은 정도를 다시 계산하는 간격 */
const TICK_MS = 5000;
/** 떠나는 시각이 지난 뒤 이만큼 있다가 다시 조회한다 (서버가 아직 떠나기 전이라고 답하지 않게) */
const LEAVE_REFETCH_DELAY_MS = 1000;

/**
 * 친구(눈사람)의 지금 상태: 와 있는지, 얼마나 녹았는지, 얼릴 수 있는지.
 * 다시 조회하지 않아도 시간이 지나면 녹기 시작하고 떠난다 (와 있는 동안 5초마다 다시 계산한다).
 * 떠나는 시각이 되면 낚시 현황을 한 번 다시 조회해, 속도·오늘의 강화처럼 서버 응답을 그대로 쓰는 화면에서도
 * 친구 보너스가 바로 빠지게 한다 (다음 주기 조회까지 최대 1분 남아 있지 않게).
 */
export function useOtterFriendPhase(
  status: FishingStatus | undefined,
  receivedAt: number,
): OtterFriendPhase {
  const [now, setNow] = useState(() => Date.now());
  const phase = otterFriendPhaseAt(status, receivedAt, now);
  const { isHere } = phase;

  useEffect(() => {
    if (!isHere) return;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [isHere]);

  // 떠나는 시각에 맞춰 화면을 바꾸고 낚시 현황을 다시 조회한다
  const queryClient = useQueryClient();
  const leavesAt =
    status?.otterFriendActive && status.otterFriendUntil
      ? toLocalMs(status.otterFriendUntil, status, receivedAt)
      : null;
  useEffect(() => {
    // 이미 지난 시각이면 예약하지 않는다 (서버가 계속 와 있다고 답해도 1초마다 다시 조회하지 않게.
    // 그때는 평소 주기 조회가 맡는다)
    if (leavesAt === null || leavesAt <= Date.now()) return;
    const timer = window.setTimeout(
      () => {
        setNow(Date.now());
        queryClient.invalidateQueries({ queryKey: fishingQueries.me().queryKey });
      },
      Math.max(leavesAt - Date.now(), 0) + LEAVE_REFETCH_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [leavesAt, queryClient]);

  // 새 응답을 받으면 (친구가 새로 오거나 얼린 직후) 바로 다시 계산한다
  useEffect(() => {
    setNow(Math.max(Date.now(), receivedAt));
  }, [receivedAt]);

  return phase;
}
