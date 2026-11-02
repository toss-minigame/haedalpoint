import { QuizCard, type TodayQuizItem } from '@/entities/quiz';
import { AnswerButtons, AnswerResult } from '@/features/answer-quiz';
import { RetryAdButton, RewardAdButton } from '@/features/quiz-ad-actions';

type Props = {
  order: number;
  item: TodayQuizItem;
  rewardPerQuiz: number;
};

type QuizActionProps = Props['item'] & Pick<Props, 'rewardPerQuiz'>;

// 도전 상태에 따라 다음 행동을 보여준다.
//   (없음) → O/X 선택
//   WRONG → 광고 보고 다시 풀기
//   RETRY_READY → O/X 다시 선택
//   CORRECT → 광고 보고 물고기 받기 → 받은 뒤에는 완료 안내
function QuizAction({ quizId, attempt, rewardPerQuiz }: QuizActionProps) {
  if (!attempt) return <AnswerButtons quizId={quizId} />;

  switch (attempt.status) {
    case 'WRONG':
      return <RetryAdButton />;
    case 'RETRY_READY':
      return <AnswerButtons quizId={quizId} />;
    case 'CORRECT':
      return attempt.rewardClaimed ? (
        <p className="text-center text-sm font-medium text-muted-foreground">
          물고기 {attempt.rewardAmount ?? rewardPerQuiz}마리를 받았어요
        </p>
      ) : (
        <RewardAdButton rewardPerQuiz={rewardPerQuiz} />
      );
  }
}

export function QuizItem({ order, item, rewardPerQuiz }: Props) {
  return (
    <QuizCard order={order} question={item.question}>
      {item.attempt && <AnswerResult attempt={item.attempt} />}
      <QuizAction {...item} rewardPerQuiz={rewardPerQuiz} />
    </QuizCard>
  );
}
