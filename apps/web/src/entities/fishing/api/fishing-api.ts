import { http } from '@/shared/api';
import type {
  FishingAdBoostResponse,
  FishingStatus,
  StoreFishResponse,
  Warehouse,
} from '../model/types';

export const fishingApi = {
  getMe: () => http.get<FishingStatus>('/fishing/me'),
  getWarehouse: () => http.get<Warehouse>('/fishing/warehouse'),
  storeFish: () => http.post<StoreFishResponse>('/fishing/store'),
  // 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다
  adEnhanceRod: () => http.post<FishingAdBoostResponse>('/fishing/ad-enhance-rod'),
  adExpandHammock: () => http.post<FishingAdBoostResponse>('/fishing/ad-expand-hammock'),
};
