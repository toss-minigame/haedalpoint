import { http } from '@/shared/api';
import type {
  TutorialCompleteResponse,
  TutorialRewardKind,
  TutorialRewardResponse,
  TutorialStatusResponse,
} from '../model/types';

export const tutorialApi = {
  getMe: () => http.get<TutorialStatusResponse>('/tutorial/me'),
  // 튜토리얼 안에서만 부른다. 광고 없이 종류별로 한 번
  claimReward: (kind: TutorialRewardKind) =>
    http.post<TutorialRewardResponse>(`/tutorial/rewards/${kind}`),
  // 마지막 단계에서 창고에 저장한 뒤에 부른다 (해달 친구 24시간)
  complete: () => http.post<TutorialCompleteResponse>('/tutorial/complete'),
  skip: () => http.post<TutorialStatusResponse>('/tutorial/skip'),
};
