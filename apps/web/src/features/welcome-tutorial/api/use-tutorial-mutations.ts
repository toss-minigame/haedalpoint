import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FishingStatus, fishingQueries } from '@/entities/fishing';
import { tutorialApi, tutorialQueries } from '@/entities/tutorial';
import { ApiError } from '@/shared/api';

const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 일시적 오류(네트워크·5xx)만 자동 재시도한다. 4xx(이미 받음 등)는 다시 해도 같다
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

/** 보상·완료 응답은 바뀐 뒤의 낚시 현황이라 바로 반영한다 (게이지·오늘의 강화·해달 친구) */
function useApplyFishingStatus() {
  const queryClient = useQueryClient();
  return (status: FishingStatus) => queryClient.setQueryData(fishingQueries.me().queryKey, status);
}

export function useClaimTutorialReward() {
  const applyFishingStatus = useApplyFishingStatus();
  return useMutation({
    mutationFn: tutorialApi.claimReward,
    retry: shouldRetry,
    onSuccess: applyFishingStatus,
  });
}

export function useCompleteTutorial() {
  const applyFishingStatus = useApplyFishingStatus();
  return useMutation({
    mutationFn: tutorialApi.complete,
    retry: shouldRetry,
    onSuccess: applyFishingStatus,
  });
}

export function useSkipTutorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tutorialApi.skip,
    onSuccess: (status) => queryClient.setQueryData(tutorialQueries.me().queryKey, status),
  });
}
