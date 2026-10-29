import { queryOptions } from '@tanstack/react-query';
import { userApi } from './user-api';

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const userQueries = {
  all: () => ['users'] as const,
  lists: () => [...userQueries.all(), 'list'] as const,
  list: () => queryOptions({ queryKey: userQueries.lists(), queryFn: userApi.getList }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...userQueries.all(), 'detail', id] as const,
      queryFn: () => userApi.getById(id),
    }),
};
