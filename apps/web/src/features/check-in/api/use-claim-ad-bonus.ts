import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type AttendanceReward, attendanceApi, attendanceQueries } from '@/entities/attendance';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 광고를 끝까지 본 뒤의 요청이라 일시적 오류(네트워크·5xx)는 자동 재시도한다.
// 4xx(이미 받음 등)는 재시도해도 결과가 같으므로 하지 않는다.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

function bonusMessage(reward: AttendanceReward): string {
  return reward.type === 'OTTER_FRIEND'
    ? '해달 친구가 한 명 더 합류했어요'
    : `강화 보너스 +${reward.amount}를 한 번 더 받았어요`;
}

/** 출석 후 광고 시청 완료 → 오늘 출석 보상을 한 번 더 받기 */
export function useClaimAdBonus() {
  const queryClient = useQueryClient();
  const refreshStatus = () =>
    queryClient.invalidateQueries({ queryKey: attendanceQueries.me().queryKey });

  return useMutation({
    mutationFn: attendanceApi.claimAdBonus,
    retry: shouldRetry,
    onSuccess: ({ bonusReward }) => {
      toast.success(bonusMessage(bonusReward));
      return refreshStatus();
    },
    onError: (error) => {
      // 다른 기기·탭에서 이미 받은 경우: 안내 후 최신 상태로 갱신
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info(error.message);
        return refreshStatus();
      }
      toast.error('광고 보너스를 받지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
