import type { FishingStatus } from '../model/types';

/** 녹기 시작하면 바로 눈에 띄게, 녹은 정도를 여기서부터 시작한다 (0~1) */
const MELT_START = 0.3;

export type OtterFriendPhase = {
  /** 지금 함께 낚시하는 중인지 (떠나는 시각이 지나면 다시 조회하지 않아도 false) */
  isHere: boolean;
  /** 녹은 정도 (0 = 멀쩡, 1 = 다 녹아 떠나기 직전). 떠나기 전 한 시간 동안 커진다 */
  melt: number;
  /** 지금 광고를 보고 얼릴 수 있는지 (녹는 중이고, 이번에 온 뒤 아직 얼리지 않음) */
  isFreezable: boolean;
};

const AWAY: OtterFriendPhase = { isHere: false, melt: 0, isFreezable: false };

/** 서버 시각 `at` 을 이 기기 시계 기준 시각(ms)으로 (서버 시각과 기기 시각 차이를 뺀다) */
export function toLocalMs(at: string, status: FishingStatus, receivedAt: number): number {
  return receivedAt + (Date.parse(at) - Date.parse(status.serverTime));
}

/**
 * 기기 시각 now(ms)에 친구가 와 있는지, 얼마나 녹았는지, 얼릴 수 있는지.
 * status 는 receivedAt(기기 시각 ms)에 받은 낚시 현황이다
 */
export function otterFriendPhaseAt(
  status: FishingStatus | undefined,
  receivedAt: number,
  now: number,
): OtterFriendPhase {
  if (!status?.otterFriendActive || !status.otterFriendUntil || !status.otterFriendMeltsAt) {
    return AWAY;
  }
  const leavesAt = toLocalMs(status.otterFriendUntil, status, receivedAt);
  const meltsAt = toLocalMs(status.otterFriendMeltsAt, status, receivedAt);
  if (now >= leavesAt) return AWAY;
  if (now < meltsAt) return { isHere: true, melt: 0, isFreezable: false };
  const progress = (now - meltsAt) / Math.max(leavesAt - meltsAt, 1);
  return {
    isHere: true,
    melt: MELT_START + (1 - MELT_START) * progress,
    isFreezable: !status.otterFriendFrozen,
  };
}
