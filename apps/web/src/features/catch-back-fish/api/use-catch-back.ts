import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fishingApi, fishingQueries, formatFish } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 광고를 끝까지 본 뒤의 요청이라 일시적 오류(네트워크·5xx)는 자동 재시도한다.
// 4xx(받을 물고기 없음·오늘 횟수 다 씀)는 재시도해도 결과가 같으므로 하지 않는다.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

/** 광고 시청 완료 → 해먹이 넘쳤던 물고기 일부를 해달이 다시 잡아와 해먹에 넣는다 */
export function useCatchBack() {
  const queryClient = useQueryClient();
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: fishingQueries.all() });

  return useMutation({
    mutationFn: fishingApi.adCatchBack,
    retry: shouldRetry,
    onSuccess: ({ caughtBackFish }) => {
      toast.success(`해달이 물고기 ${formatFish(caughtBackFish)}마리를 다시 잡아왔어요`);
      return refreshStatus();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return refreshStatus();
      }
      toast.error('물고기를 다시 잡아오지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
