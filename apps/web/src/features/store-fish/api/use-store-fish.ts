import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fishingApi, fishingQueries, formatFish } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

/**
 * 해먹의 물고기를 창고로 옮긴다. 수량은 서버가 정산한 값이다.
 * 넘친 물고기를 다시 잡아올 수 있으면 저장 안내 대신 onCatchBackAvailable 을 부른다
 * (그 창이 저장한 양을 함께 보여준다. 넘친 양은 알려주지 않는다)
 */
export function useStoreFish(onCatchBackAvailable?: (storedFish: number) => boolean) {
  const queryClient = useQueryClient();
  // 해먹 현황과 창고 화면을 함께 다시 불러온다
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: fishingQueries.all() });

  return useMutation({
    mutationFn: fishingApi.storeFish,
    onSuccess: ({ storedFish, catchBackAvailable }) => {
      // 다시 잡아오기 창을 띄웠으면 그 창이 저장 결과를 보여주므로, 창을 가리는 아래쪽 안내는 띄우지 않는다
      const openedCatchBack = catchBackAvailable && (onCatchBackAvailable?.(storedFish) ?? false);
      if (!openedCatchBack)
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
