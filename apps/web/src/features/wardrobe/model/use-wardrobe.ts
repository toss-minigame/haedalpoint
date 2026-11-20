import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { type OutfitCode, type OutfitItem, outfitQueries, toggleOutfit } from '@/entities/otter';
import { useEquipOutfits } from '../api/use-equip-outfits';
import { useUnlockOutfit } from '../api/use-unlock-outfit';
import { equippedOf, isSameSet, savableOf } from '../lib/wardrobe-look';

export type Wardrobe = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** 해달에게 입힐 소품. 옷장을 연 동안은 입어 보는 잠긴 소품도 들어 있다 */
  worn: readonly OutfitCode[];
  /** 소품 목록. 아직 못 불러왔으면 undefined */
  outfits: readonly OutfitItem[] | undefined;
  isError: boolean;
  retry: () => void;
  warehouseFish: number;
  /** 소품을 누른다: 연 소품은 바로 입고(벗고) 저장하고, 잠긴 소품은 입어만 본다 */
  toggle: (code: OutfitCode) => void;
  /** 창고 물고기를 내고 소품을 연다 */
  unlock: (code: OutfitCode) => void;
  /** 지금 여는 중인 소품 */
  unlockingCode: OutfitCode | null;
};

const NO_OUTFITS: readonly OutfitItem[] = [];

/** 옷장 상태: 서버의 소품 목록과, 옷장을 연 동안 해달에게 보이는 차림 */
export function useWardrobe(): Wardrobe {
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useQuery(outfitQueries.me());
  // 옷장을 연 동안 해달에게 보이는 차림. 닫으면 null 이 되어 저장된 차림으로 돌아간다 (입어 보던 것은 벗는다)
  const [look, setLook] = useState<readonly OutfitCode[] | null>(null);
  const outfits = data?.outfits ?? NO_OUTFITS;
  const equipped = useMemo(() => equippedOf(outfits), [outfits]);
  const equip = useEquipOutfits({ onFailed: () => setLook(null) });
  const unlockOutfit = useUnlockOutfit();

  const open = () => {
    setLook(equipped);
    // 옷장 밖에서 창고에 저장했을 수 있으니 창고 물고기를 새로 받는다
    void queryClient.invalidateQueries({ queryKey: outfitQueries.all() });
  };

  const toggle = (code: OutfitCode) => {
    if (!data || look === null) return;
    const next = toggleOutfit(look, code);
    setLook(next);
    const toSave = savableOf(next, data.outfits);
    if (!isSameSet(toSave, equipped)) equip.mutate(toSave);
  };

  return {
    isOpen: look !== null,
    open,
    close: () => setLook(null),
    worn: look ?? equipped,
    outfits: data?.outfits,
    isError,
    retry: () => void refetch(),
    warehouseFish: data?.warehouseFish ?? 0,
    toggle,
    unlock: (code) => unlockOutfit.mutate(code),
    unlockingCode: unlockOutfit.isPending ? unlockOutfit.variables : null,
  };
}
