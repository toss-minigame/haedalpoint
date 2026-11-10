import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type AttendanceReward, attendanceApi, attendanceQueries } from '@/entities/attendance';
import { fishingQueries } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;

/** 출석으로 오늘 받은 보상을 문장으로 */
function rewardSentence(reward: AttendanceReward): string {
  if (reward.type === 'OTTER_FRIEND') return '오늘 해달 친구가 함께 낚시해요';
  return reward.amount > 1
    ? `오늘 낚싯대를 ${reward.amount}단계 강화했어요`
    : '오늘 낚싯대를 강화했어요';
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const refreshStatus = () =>
    queryClient.invalidateQueries({ queryKey: attendanceQueries.me().queryKey });

  return useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: ({ streakDay, reward, cycleCompleted }) => {
      const attended = cycleCompleted ? '7일 연속 출석했어요' : `${streakDay}일차 출석했어요`;
      const message = `${attended}. ${rewardSentence(reward)}`;
      toast.success(message);
      // 출석 보상으로 낚시 속도가 바뀌었으니 해먹 현황도 다시 받는다
      return Promise.all([
        refreshStatus(),
        queryClient.invalidateQueries({ queryKey: fishingQueries.all() }),
      ]);
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
