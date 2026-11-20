import { Button } from '@/shared/ui/button';
import { WardrobeIcon } from '@/shared/ui/reward-icons';
import { REWARD_TILE_CLASS, RewardTileContent } from '@/shared/ui/reward-tile';
import type { Wardrobe } from '../model/use-wardrobe';

type Props = {
  wardrobe: Wardrobe;
  /** 옷장 창의 id (열렸는지 낭독기에 알린다) */
  panelId: string;
};

// 홈 리워드 아이콘 줄 아래의 옷장 아이콘. 누르면 옷장 창을 열고 닫는다
export function WardrobeTile({ wardrobe, panelId }: Props) {
  const { outfits, isOpen } = wardrobe;
  const ownedCount = outfits?.filter((outfit) => outfit.owned).length ?? 0;
  const status = outfits ? `${ownedCount}/${outfits.length}` : '꾸미기';

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={REWARD_TILE_CLASS}
      aria-expanded={isOpen}
      aria-controls={panelId}
      aria-label={`옷장 ${isOpen ? '닫기' : '열기'}, 소품 ${status}`}
      onClick={isOpen ? wardrobe.close : wardrobe.open}
    >
      <RewardTileContent icon={<WardrobeIcon />} title="옷장" status={status} />
    </Button>
  );
}
