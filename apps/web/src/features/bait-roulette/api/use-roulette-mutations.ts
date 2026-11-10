import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fishingQueries } from '@/entities/fishing';
import {
  type BaitRouletteSpin,
  type RouletteToday,
  rouletteApi,
  rouletteQueries,
} from '@/entities/roulette';
import { ApiError } from '@/shared/api';

const HTTP_CONFLICT = 409;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
const MAX_RETRY = 2;

// 광고를 끝까지 본 뒤의 요청이라 일시적 오류(네트워크·5xx)는 자동 재시도한다.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.statusCode < HTTP_SERVER_ERROR;
  return !isClientError && failureCount < MAX_RETRY;
}

function patchSpin(queryClient: QueryClient, spin: BaitRouletteSpin) {
  queryClient.setQueryData(
    rouletteQueries.today().queryKey,
    (today: RouletteToday | undefined) =>
      today && { ...today, spin, canSpin: false, canApply: spin.appliedAt === null },
  );
}

/** 다른 기기·탭에서 먼저 처리한 경우: 서버 안내를 보여주고 최신 상태로 갱신 */
function handleStaleError(queryClient: QueryClient, error: Error, fallbackMessage: string) {
  const isStale =
    error instanceof ApiError &&
    (error.statusCode === HTTP_CONFLICT || error.statusCode === HTTP_NOT_FOUND);
  if (isStale) {
    toast.info(error.message);
    return queryClient.invalidateQueries({ queryKey: rouletteQueries.all() });
  }
  toast.error(fallbackMessage);
}

/** 오늘 한 번 룰렛 돌리기. 결과는 아직 적용되지 않는다 */
export function useSpinRoulette() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rouletteApi.spin,
    onSuccess: (spin) => patchSpin(queryClient, spin),
    onError: (error) =>
      handleStaleError(queryClient, error, '룰렛을 돌리지 못했어요. 잠시 후 다시 시도해 주세요.'),
  });
}

/** 광고 시청 완료 → 오늘 미끼를 달아 자정까지 낚시 속도를 올린다 */
export function useApplyBait() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rouletteApi.applyAdBait,
    retry: shouldRetry,
    onSuccess: (spin) => {
      patchSpin(queryClient, spin);
      // 낚시 속도가 바뀌었으니 홈 화면의 해먹 현황을 다시 받는다
      return queryClient.invalidateQueries({ queryKey: fishingQueries.all() });
    },
    onError: (error) =>
      handleStaleError(queryClient, error, '미끼를 달지 못했어요. 잠시 후 다시 시도해 주세요.'),
  });
}
