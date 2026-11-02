import { QuizCard, type TodayQuizItem } from '@/entities/quiz';
import { AnswerButtons, AnswerResult } from '@/features/answer-quiz';
import { RetryAdButton, RewardAdButton } from '@/features/quiz-ad-actions';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';

type Props = {
  order: number;
  item: TodayQuizItem;
  /** 정답 후 광고 1회로 오르는 낚시 속도 (%) */
  rewardSpeedBonusPercent: number;
  // 화면에서 미리 불러온 보상형 광고 (같은 광고 그룹은 한 번에 하나만 미리 불러올 수 있어 공유)
  ad: RewardedAd;
};

type QuizActionProps = Props['item'] & Pick<Props, 'rewardSpeedBonusPercent' | 'ad'>;

// 도전 상태에 따라 다음 행동을 보여준다.
//   (없음) → O/X 선택
//   WRONG → 광고 보고 다시 풀기
//   RETRY_READY → O/X 다시 선택
//   CORRECT → 광고 보고 낚싯대 강화하기 → 강화한 뒤에는 완료 안내
function QuizAction({ quizId, attempt, rewardSpeedBonusPercent, ad }: QuizActionProps) {
  if (!attempt) return <AnswerButtons quizId={quizId} />;

  switch (attempt.status) {
    case 'WRONG':
      return <RetryAdButton quizId={quizId} ad={ad} />;
    case 'RETRY_READY':
      return <AnswerButtons quizId={quizId} />;
    case 'CORRECT':
      return attempt.rewardClaimed ? (
        <p className="text-center text-base font-medium text-muted-foreground">
          낚싯대를 강화했어요
        </p>
      ) : (
        <RewardAdButton quizId={quizId} ad={ad} speedBonusPercent={rewardSpeedBonusPercent} />
      );
  }
}

export function QuizItem({ order, item, rewardSpeedBonusPercent, ad }: Props) {
  return (
    <QuizCard order={order} question={item.question}>
      {item.attempt && <AnswerResult attempt={item.attempt} />}
      <QuizAction {...item} rewardSpeedBonusPercent={rewardSpeedBonusPercent} ad={ad} />
    </QuizCard>
  );
}
