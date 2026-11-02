import { queryOptions } from '@tanstack/react-query';
import { fishingApi } from './fishing-api';

// 해먹 수량은 화면에서 속도로 늘려 보여주고(project-hammock), 실제 값은 주기적으로 서버에서 다시 받는다.
// 자정에 강화·해달 친구가 풀리는 것도 이 주기 안에 반영된다.
const REFETCH_INTERVAL_MS = 60_000;

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const fishingQueries = {
  all: () => ['fishing'] as const,
  me: () =>
    queryOptions({
      queryKey: [...fishingQueries.all(), 'me'] as const,
      queryFn: fishingApi.getMe,
      refetchInterval: REFETCH_INTERVAL_MS,
    }),
};
