import { formatAnswer, type QuizAttemptResult } from '@/entities/quiz';
import { cn } from '@/shared/lib/utils';

type Props = {
  attempt: QuizAttemptResult;
};

type ResultMessage = {
  title: string;
  detail: string;
};

function getResultMessage({ status, userAnswer, correctAnswer }: QuizAttemptResult): ResultMessage {
  switch (status) {
    case 'CORRECT':
      return {
        title: '정답이에요!',
        detail: `정답은 ${formatAnswer(correctAnswer ?? userAnswer)}예요.`,
      };
    case 'WRONG':
      return {
        title: '아쉽지만 틀렸어요',
        detail: `${formatAnswer(userAnswer)}를 골랐어요. 광고를 보면 한 번 더 풀 수 있어요.`,
      };
    case 'RETRY_READY':
      return {
        title: '다시 도전해 보세요',
        detail: '정답이라고 생각하는 답을 골라 주세요.',
      };
  }
}

// 상태별 결과 안내. 정답·해설은 맞힌 경우(CORRECT)에만 서버가 내려준다.
export function AnswerResult({ attempt }: Props) {
  const { title, detail } = getResultMessage(attempt);
  const isCorrect = attempt.status === 'CORRECT';

  return (
    <div
      role="status"
      className={cn(
        'rounded-lg px-4 py-3 text-base',
        // 정답은 초록 틴트로 오답(중립)과 구분
        isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-muted',
      )}
    >
      <p className={cn('font-bold', isCorrect && 'text-emerald-700 dark:text-emerald-300')}>
        {title}
      </p>
      <p className="mt-1 text-muted-foreground">{detail}</p>
      {isCorrect && attempt.explanation && <p className="mt-2">{attempt.explanation}</p>}
    </div>
  );
}
