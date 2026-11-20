import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fishingQueries } from '@/entities/fishing';
import { OUTFITS, outfitApi, outfitQueries } from '@/entities/otter';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

/**
 * 창고 물고기를 내고 소품을 연다 (연 소품은 서버가 바로 입힌다).
 * 다시 시도하지 않는다 (요청이 처리됐는데 응답만 못 받았으면, 다시 보내도 이미 연 소품이라 409 가 된다)
 */
export function useUnlockOutfit() {
  const queryClient = useQueryClient();
  // 창고 물고기가 줄었으니 홈 창고 칩과 창고 화면도 다시 불러온다
  const refreshFish = () => queryClient.invalidateQueries({ queryKey: fishingQueries.all() });

  return useMutation({
    mutationFn: outfitApi.unlock,
    onSuccess: (outfits, code) => {
      queryClient.setQueryData(outfitQueries.me().queryKey, outfits);
      toast.success(`${OUTFITS[code].name} 소품을 열었어요`);
      return refreshFish();
    },
    onError: (error) => {
      // 물고기가 모자라거나 이미 연 소품: 안내 후 최신 상태로 갱신
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return Promise.all([
          refreshFish(),
          queryClient.invalidateQueries({ queryKey: outfitQueries.all() }),
        ]);
      }
      toast.error('소품을 열지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
