import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fishingApi, fishingQueries, formatFish } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

/** 해먹의 물고기를 창고로 옮긴다. 수량은 서버가 정산한 값이다 */
export function useStoreFish() {
  const queryClient = useQueryClient();
  // 해먹 현황과 창고 화면을 함께 다시 불러온다
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: fishingQueries.all() });

  return useMutation({
    mutationFn: fishingApi.storeFish,
    onSuccess: ({ storedFish }) => {
      toast.success(`물고기 ${formatFish(storedFish)}마리를 창고에 저장했어요`);
      return refreshStatus();
    },
    onError: (error) => {
      // 저장할 물고기가 없거나 다른 기기에서 먼저 저장한 경우: 안내 후 최신 상태로 갱신
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return refreshStatus();
      }
      toast.error('창고에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
