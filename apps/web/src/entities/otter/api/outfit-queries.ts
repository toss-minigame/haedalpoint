import { queryOptions } from '@tanstack/react-query';
import { outfitApi } from './outfit-api';

// 쿼리 키와 queryFn 을 한 곳에서 관리 (키 팩토리 패턴)
export const outfitQueries = {
  all: () => ['outfits'] as const,
  // 소품 목록(열었는지·입었는지)과 창고 물고기. 소품을 열거나 입힐 때 응답으로 바로 바꿔 넣는다
  me: () =>
    queryOptions({
      queryKey: [...outfitQueries.all(), 'me'] as const,
      queryFn: outfitApi.getMe,
    }),
};
