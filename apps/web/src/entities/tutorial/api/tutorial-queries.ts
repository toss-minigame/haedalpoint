import { queryOptions } from '@tanstack/react-query';
import { tutorialApi } from './tutorial-api';

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const tutorialQueries = {
  all: () => ['tutorial'] as const,
  // 튜토리얼을 띄울지 정하는 값이라 한 번 받으면 진행하는 동안 다시 받지 않는다
  me: () =>
    queryOptions({
      queryKey: [...tutorialQueries.all(), 'me'] as const,
      queryFn: tutorialApi.getMe,
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
    }),
};
