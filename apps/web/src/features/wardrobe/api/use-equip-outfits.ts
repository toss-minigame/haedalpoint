import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { outfitApi, outfitQueries } from '@/entities/otter';

type EquipOutfitsOptions = {
  /** 저장하지 못했을 때 부른다 (화면의 차림을 저장된 차림으로 되돌린다) */
  onFailed: () => void;
};

/** 입은 소품을 저장한다. 입을 소품 전체를 보내므로 여러 번 보내도 마지막 차림으로 맞춰진다 */
export function useEquipOutfits({ onFailed }: EquipOutfitsOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: outfitApi.equip,
    onSuccess: (outfits) => {
      queryClient.setQueryData(outfitQueries.me().queryKey, outfits);
    },
    onError: () => {
      toast.error('옷을 갈아입히지 못했어요. 잠시 후 다시 시도해 주세요.');
      onFailed();
      return queryClient.invalidateQueries({ queryKey: outfitQueries.all() });
    },
  });
}
