import { queryOptions } from '@tanstack/react-query';
import { quizApi } from './quiz-api';

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const quizQueries = {
  all: () => ['quiz'] as const,
  today: () =>
    queryOptions({
      queryKey: [...quizQueries.all(), 'today'] as const,
      queryFn: quizApi.getToday,
    }),
};
