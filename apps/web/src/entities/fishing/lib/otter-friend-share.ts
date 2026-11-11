import type { FishingStatus } from '../model/types';

const BASE_SPEED_PERCENT = 100;

/**
 * 해달 친구로 오른 낚시 속도 (기본 속도 대비 %).
 * 응답에 따로 없어서 전체 속도 보너스에서 낚싯대·미끼 몫을 뺀다.
 */
export function otterFriendSpeedBonusPercent(status: FishingStatus): number {
  return (
    status.speedPercent -
    BASE_SPEED_PERCENT -
    status.rodSpeedBonusPercent -
    status.baitSpeedBonusPercent
  );
}

/** 지금 속도 중 해달 친구 몫 (시간당 마리). 기본 속도에 친구 보너스 비율을 곱한다 */
export function otterFriendFishPerHour(status: FishingStatus): number {
  const baseFishPerHour = (status.fishPerHour * BASE_SPEED_PERCENT) / status.speedPercent;
  return (baseFishPerHour * otterFriendSpeedBonusPercent(status)) / BASE_SPEED_PERCENT;
}
