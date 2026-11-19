import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type ClaimTossPointResponse, fishingApi, fishingQueries } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

type ClaimTossPointOptions = {
  /** 받은 결과로 결과 창을 띄운다 */
  onClaimed: (result: ClaimTossPointResponse) => void;
};

/**
 * 창고 물고기를 1원 단위로 받을 수 있는 만큼 토스 포인트로 받는다. 금액은 서버가 정한다.
 * 다시 시도하지 않는다 (요청이 처리됐는데 응답만 못 받았으면, 다시 보내도 받을 양이 없어 409 가 된다)
 */
export function useClaimTossPoint({ onClaimed }: ClaimTossPointOptions) {
  const queryClient = useQueryClient();
  // 창고 화면과 홈 현황(창고 수량)을 함께 다시 불러온다
  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: fishingQueries.all() });

  return useMutation({
    mutationFn: fishingApi.claimTossPoint,
    onSuccess: (result) => {
      onClaimed(result);
      return refreshStatus();
    },
    onError: (error) => {
      // 받을 물고기가 부족하거나 오늘 한도를 다 쓴 경우: 안내 후 최신 상태로 갱신
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return refreshStatus();
      }
      toast.error('토스 포인트를 받지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
