import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { attendanceApi, attendanceQueries, formatReward } from '@/entities/attendance';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

export function useCheckIn() {
  const queryClient = useQueryClient();
  const refreshStatus = () =>
    queryClient.invalidateQueries({ queryKey: attendanceQueries.me().queryKey });

  return useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: ({ streakDay, reward, cycleCompleted }) => {
      const message = cycleCompleted
        ? `7일 연속 출석 달성! ${formatReward(reward)}가 합류했어요`
        : `${streakDay}일차 출석 완료! ${formatReward(reward)}`;
      toast.success(message);
      return refreshStatus();
    },
    onError: (error) => {
      // 다른 기기/탭에서 이미 출석한 경우: 에러가 아니라 안내로 처리
      if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
        toast.info('이미 출석했어요');
        return refreshStatus();
      }
      toast.error(error.message);
    },
  });
}
