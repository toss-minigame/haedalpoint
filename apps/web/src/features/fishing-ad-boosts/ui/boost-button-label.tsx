import type { ReactNode } from 'react';
import { REWARD_TILE_CLASS, RewardTileContent } from '@/shared/ui/reward-tile';

/** 홈 위쪽 리워드 아이콘 줄에 놓는 광고 강화 버튼 모양 */
export const BOOST_BUTTON_CLASS = REWARD_TILE_CLASS;

type Props = {
  icon: ReactNode;
  title: string;
  /** 아랫줄: 지금 누를 수 있는지 (예: 광고 +1%, 18분 뒤) */
  status: string;
  /** 지금 광고를 보고 받을 수 있으면 true (빨간 ! 를 붙인다) */
  isAvailable?: boolean;
  isPending?: boolean;
};

// 광고 강화 버튼 안: 아이콘 + 무엇을 하는지 + 지금 누를 수 있는지
export function BoostButtonLabel({
  icon,
  title,
  status,
  isAvailable = false,
  isPending = false,
}: Props) {
  return (
    <RewardTileContent
      icon={icon}
      title={title}
      status={status}
      hasBadge={isAvailable}
      isDimmed={!isAvailable && !isPending}
      isPending={isPending}
    />
  );
}
