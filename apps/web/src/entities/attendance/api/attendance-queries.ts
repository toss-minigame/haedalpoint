import { queryOptions } from '@tanstack/react-query';
import { attendanceApi } from './attendance-api';

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const attendanceQueries = {
  all: () => ['attendance'] as const,
  me: () =>
    queryOptions({
      queryKey: [...attendanceQueries.all(), 'me'] as const,
      queryFn: attendanceApi.getMe,
    }),
};
