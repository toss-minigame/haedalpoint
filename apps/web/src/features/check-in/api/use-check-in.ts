import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { attendanceApi, attendanceQueries, type CheckInResponse } from '@/entities/attendance';
import { fishingQueries } from '@/entities/fishing';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 광고를 끝까지 본 뒤의 요청이라 일시적 오류(네트워크·5xx)는 자동 재시도한다.
// 4xx(이미 출석함 등)는 재시도해도 결과가 같으므로 하지 않는다.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

type ResultMessage = { text: string; isFailure: boolean };

/** 출석으로 받은 보상을 문장으로. 토스 포인트는 지급 상태에 따라 문장이 다르다 */
function rewardSentence({ reward, tossPointGrant }: CheckInResponse): ResultMessage {
  switch (reward.type) {
    case 'TOSS_POINT': {
      const points = `토스 포인트 ${reward.amount}원`;
      if (tossPointGrant === 'SUCCESS') return { text: `${points}을 지급했어요`, isFailure: false };
      if (tossPointGrant === 'FAILED')
        return {
          text: `${points}을 지급하지 못했어요. 고객센터로 문의해 주세요`,
          isFailure: true,
        };
      // PENDING: 서버가 다시 시도해 지급한다
      return { text: `${points}을 지급하고 있어요`, isFailure: false };
    }
    case 'OTTER_FRIEND':
      return { text: '눈사람 친구가 24시간 함께 낚시해요', isFailure: false };
    case 'ENHANCE_BONUS':
      return {
        text: `오늘 자정까지 낚싯대를 ${reward.amount}단계 강화했어요`,
        isFailure: false,
      };
  }
}

/** 광고 시청 완료 → 출석하고 그날 보상을 받는다 */
export function useCheckIn() {
  const queryClient = useQueryClient();
  const refreshStatus = () =>
    queryClient.invalidateQueries({ queryKey: attendanceQueries.me().queryKey });

  return useMutation({
    mutationFn: attendanceApi.checkIn,
    retry: shouldRetry,
    onSuccess: (result) => {
      const { text, isFailure } = rewardSentence(result);
      const message = `${result.attendanceDay}일째 출석했어요. ${text}`;
      if (isFailure) toast.error(message);
      else toast.success(message);
      // 출석 보상으로 낚시 속도·해달 친구가 바뀔 수 있으니 해먹 현황도 다시 받는다
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
      toast.error('출석하지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });
}
