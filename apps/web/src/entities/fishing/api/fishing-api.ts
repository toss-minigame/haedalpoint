import { http } from '@/shared/api';
import type {
  FishingAdBoostResponse,
  FishingCatchBackResponse,
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
  // 저장 응답의 catchBackAvailable 이 true 일 때만 권한다
  adCatchBack: () => http.post<FishingCatchBackResponse>('/fishing/ad-catch-back'),
};
