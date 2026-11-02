import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patchTodayAttempt, quizApi, quizQueries } from '@/entities/quiz';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 광고를 끝까지 본 뒤의 요청이라 일시적 오류(네트워크·5xx)는 자동 재시도한다.
// 4xx(이미 처리됨 등)는 재시도해도 결과가 같으므로 하지 않는다.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

function handleError(queryClient: QueryClient, error: Error, fallbackMessage: string) {
  // 다른 기기·탭에서 이미 처리된 경우: 안내 후 최신 상태로 갱신
  if (error instanceof ApiError && error.statusCode === HTTP_CONFLICT) {
    toast.info(error.message);
    return queryClient.invalidateQueries({ queryKey: quizQueries.today().queryKey });
  }
  toast.error(fallbackMessage);
}

/** 오답 후 광고 시청 완료 → 재도전 기회 열기 */
export function useUnlockQuizRetry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => quizApi.unlockRetry(quizId),
    retry: shouldRetry,
    onSuccess: ({ quizId, status }) => {
      queryClient.setQueryData(quizQueries.today().queryKey, (today) =>
        patchTodayAttempt(today, quizId, (attempt) => attempt && { ...attempt, status }),
      );
    },
    onError: (error) =>
      handleError(queryClient, error, '다시 풀기를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.'),
  });
}

/** 정답 후 광고 시청 완료 → 물고기 보상 */
export function useClaimQuizReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => quizApi.claimReward(quizId),
    retry: shouldRetry,
    onSuccess: ({ quizId, rewardAmount }) => {
      toast.success(`물고기 ${rewardAmount}마리를 받았어요`);
      queryClient.setQueryData(quizQueries.today().queryKey, (today) =>
        patchTodayAttempt(
          today,
          quizId,
          (attempt) => attempt && { ...attempt, rewardAmount, rewardClaimed: true },
        ),
      );
    },
    onError: (error) =>
      handleError(queryClient, error, '물고기를 받지 못했어요. 잠시 후 다시 시도해 주세요.'),
  });
}
