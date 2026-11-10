import { http } from '@/shared/api';
import type { ApplyBaitResponse, RouletteToday, SpinBaitRouletteResponse } from '../model/types';

export const rouletteApi = {
  getToday: () => http.get<RouletteToday>('/roulette/today'),
  spin: () => http.post<SpinBaitRouletteResponse>('/roulette/spin'),
  // 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다
  applyAdBait: () => http.post<ApplyBaitResponse>('/roulette/ad-apply'),
};
