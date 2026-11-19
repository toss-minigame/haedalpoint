import { http } from '@/shared/api';
import type {
  ClaimTossPointResponse,
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
  // 창고 물고기를 1원 단위로 받을 수 있는 만큼 토스 포인트로 받는다
  claimTossPoint: () => http.post<ClaimTossPointResponse>('/fishing/claim-toss-point'),
  // 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다
  adEnhanceRod: () => http.post<FishingAdBoostResponse>('/fishing/ad-enhance-rod'),
  adExpandHammock: () => http.post<FishingAdBoostResponse>('/fishing/ad-expand-hammock'),
  // 눈사람 친구가 녹는 중(현황의 otterFriendFreezable)일 때, 광고를 끝까지 본 뒤에만 호출한다
  adFreezeFriend: () => http.post<FishingAdBoostResponse>('/fishing/ad-freeze-friend'),
  // 저장 응답의 catchBackAvailable 이 true 일 때만 권한다
  adCatchBack: () => http.post<FishingCatchBackResponse>('/fishing/ad-catch-back'),
};
