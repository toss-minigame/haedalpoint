import type { QuizAttemptResult, QuizAttemptStatus } from '@haedalpoint/shared';
import type { Quiz } from '../entities/quiz.entity';
import type { QuizAttempt } from '../entities/quiz-attempt.entity';

export type AttemptState = Pick<
  QuizAttempt,
  'userAnswer' | 'isCorrect' | 'wrongCount' | 'retryUnlocked' | 'rewardAmount' | 'rewardClaimedAt'
>;

function toStatus({ isCorrect, retryUnlocked }: AttemptState): QuizAttemptStatus {
  if (isCorrect) return 'CORRECT';
  return retryUnlocked ? 'RETRY_READY' : 'WRONG';
}

/**
 * 도전 기록 → API 응답.
 * 정답·해설은 맞힌 뒤에만 노출한다 (틀렸을 때 노출하면 O/X 재도전이 의미가 없어짐).
 * nullable 컬럼은 insert 직후 undefined 일 수 있어 null 과 함께 처리한다.
 */
export function toAttemptResult(attempt: AttemptState, quiz: Quiz): QuizAttemptResult {
  const revealed = attempt.isCorrect;
  return {
    status: toStatus(attempt),
    userAnswer: attempt.userAnswer,
    isCorrect: attempt.isCorrect,
    wrongCount: attempt.wrongCount,
    correctAnswer: revealed ? quiz.answer : null,
    explanation: revealed ? (quiz.explanation ?? null) : null,
    rewardAmount: attempt.rewardAmount ?? null,
    rewardClaimed: attempt.rewardClaimedAt != null,
  };
}
