import { http } from '@/shared/api';
import type { FishingStatus, StoreFishResponse } from '../model/types';

export const fishingApi = {
  getMe: () => http.get<FishingStatus>('/fishing/me'),
  storeFish: () => http.post<StoreFishResponse>('/fishing/store'),
};
