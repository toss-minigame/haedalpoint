import { Button } from '@/shared/ui/button';
import { useAnswerQuiz } from '../api/use-answer-quiz';

type Props = {
  quizId: string;
};

const CHOICES = [
  { answer: true, label: 'O', description: '맞아요' },
  { answer: false, label: 'X', description: '아니에요' },
] as const;

export function AnswerButtons({ quizId }: Props) {
  const { mutate, isPending } = useAnswerQuiz();

  return (
    <div className="grid grid-cols-2 gap-3">
      {CHOICES.map(({ answer, label, description }) => (
        <Button
          key={label}
          type="button"
          variant="outline"
          aria-label={`${label}, ${description}`}
          className="h-20 flex-col gap-1 text-3xl font-black"
          // isPending 동안 비활성화해 연타 방어 (서버 유니크 제약·조건부 UPDATE 가 최종 방어선)
          disabled={isPending}
          onClick={() => mutate({ quizId, answer })}
        >
          <span aria-hidden>{label}</span>
          <span aria-hidden className="text-xs font-medium text-muted-foreground">
            {description}
          </span>
        </Button>
      ))}
    </div>
  );
}
