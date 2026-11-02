import type { QuizAttemptResult, TodayQuizResponse } from '../model/types';

/**
 * 오늘의 퀴즈 캐시에서 한 문제의 도전 상태만 바꾼 새 객체를 돌려준다 (불변 업데이트).
 * 아직 도전 기록이 없는 문제는 patch 에 null 이 전달된다.
 */
export function patchTodayAttempt(
  today: TodayQuizResponse | undefined,
  quizId: string,
  patch: (attempt: QuizAttemptResult | null) => QuizAttemptResult | null,
): TodayQuizResponse | undefined {
  if (!today) return today;
  return {
    ...today,
    items: today.items.map((item) =>
      item.quizId === quizId ? { ...item, attempt: patch(item.attempt) } : item,
    ),
  };
}
