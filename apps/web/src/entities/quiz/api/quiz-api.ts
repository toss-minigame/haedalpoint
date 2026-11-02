import { http } from '@/shared/api';
import type {
  AnswerQuizResponse,
  ClaimQuizRewardResponse,
  TodayQuizResponse,
  UnlockQuizRetryResponse,
} from '../model/types';

const quizPath = (quizId: string) => `/quiz/${encodeURIComponent(quizId)}`;

export const quizApi = {
  getToday: () => http.get<TodayQuizResponse>('/quiz/today'),
  answer: (quizId: string, answer: boolean) =>
    http.post<AnswerQuizResponse>(`${quizPath(quizId)}/answer`, { answer }),
  // 광고 시청 완료(`userEarnedReward`) 후에만 호출한다 — 보상형 광고 연결은 후속 PR
  unlockRetry: (quizId: string) =>
    http.post<UnlockQuizRetryResponse>(`${quizPath(quizId)}/ad-retry`),
  claimReward: (quizId: string) =>
    http.post<ClaimQuizRewardResponse>(`${quizPath(quizId)}/ad-reward`),
};
