import { http } from '@/shared/api';
import type { OutfitCode } from '../lib/otter-outfits';
import type { Outfits } from '../model/types';

export const outfitApi = {
  getMe: () => http.get<Outfits>('/outfits'),
  // 창고 물고기를 내고 소품을 연다 (연 소품은 바로 입는다)
  unlock: (code: OutfitCode) => http.post<Outfits>(`/outfits/${code}/unlock`),
  // 입을 소품 전체를 보낸다 (빈 배열이면 모두 벗는다)
  equip: (codes: readonly OutfitCode[]) => http.put<Outfits>('/outfits/equipped', { codes }),
};
