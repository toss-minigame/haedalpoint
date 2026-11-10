import { queryOptions } from '@tanstack/react-query';
import { rouletteApi } from './roulette-api';

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const rouletteQueries = {
  all: () => ['roulette'] as const,
  today: () =>
    queryOptions({
      queryKey: [...rouletteQueries.all(), 'today'] as const,
      queryFn: rouletteApi.getToday,
    }),
};
