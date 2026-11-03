import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type FishingAdBoostResponse, fishingApi, fishingQueries } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 광고를 끝까지 본 뒤의 요청이라 일시적 오류(네트워크·5xx)는 자동 재시도한다.
// 4xx(쿨타임·이미 받음 등)는 재시도해도 결과가 같으므로 하지 않는다.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

type AdBoostOptions = {
  mutationFn: () => Promise<FishingAdBoostResponse>;
  successMessage: (status: FishingAdBoostResponse) => string;
  failureMessage: string;
};

function useFishingAdBoost({ mutationFn, successMessage, failureMessage }: AdBoostOptions) {
  const queryClient = useQueryClient();
  const refreshStatus = () =>
    queryClient.invalidateQueries({ queryKey: fishingQueries.me().queryKey });

  return useMutation({
    mutationFn,
    retry: shouldRetry,
    onSuccess: (status) => {
      toast.success(successMessage(status));
      // 응답이 바뀐 뒤의 현황이라 바로 반영하고, 해먹 수량 추정 기준 시각도 새로 잡는다
      queryClient.setQueryData(fishingQueries.me().queryKey, status);
    },
    onError: (error) => {
      // 다른 기기·탭에서 먼저 받았거나 쿨타임 중인 경우: 안내 후 최신 상태로 갱신
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return refreshStatus();
      }
      toast.error(failureMessage);
    },
  });
}

/** 광고 시청 완료 → 오늘 자정까지 낚싯대 강화 */
export function useAdEnhanceRod() {
  return useFishingAdBoost({
    mutationFn: fishingApi.adEnhanceRod,
    successMessage: ({ rodSpeedBonusPercent }) =>
      `낚싯대를 강화했어요 · 오늘 낚시 속도 +${rodSpeedBonusPercent}%`,
    failureMessage: '낚싯대를 강화하지 못했어요. 잠시 후 다시 시도해 주세요.',
  });
}

/** 광고 시청 완료 → 오늘 자정까지 해먹 넓히기 */
export function useAdExpandHammock() {
  return useFishingAdBoost({
    mutationFn: fishingApi.adExpandHammock,
    successMessage: ({ hammockExpandBonusPercent }) =>
      `해먹을 넓혔어요 · 오늘 해먹 용량 +${hammockExpandBonusPercent}%`,
    failureMessage: '해먹을 넓히지 못했어요. 잠시 후 다시 시도해 주세요.',
  });
}
