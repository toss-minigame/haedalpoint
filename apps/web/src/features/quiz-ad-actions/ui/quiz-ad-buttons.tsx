import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useClaimQuizReward, useUnlockQuizRetry } from '../api/use-quiz-ad-mutations';

type QuizAdButtonProps = {
  quizId: string;
  ad: RewardedAd;
};

export function RetryAdButton({ quizId, ad }: QuizAdButtonProps) {
  const { mutate, isPending } = useUnlockQuizRetry();

  return (
    <RewardedAdButton
      ad={ad}
      label="광고 보고 다시 풀기"
      incompleteMessage="광고를 끝까지 보면 다시 풀 수 있어요"
      variant="outline"
      isPending={isPending}
      onReward={() => mutate(quizId)}
    />
  );
}

type RewardAdButtonProps = QuizAdButtonProps & {
  rewardPerQuiz: number;
};

export function RewardAdButton({ quizId, ad, rewardPerQuiz }: RewardAdButtonProps) {
  const { mutate, isPending } = useClaimQuizReward();

  return (
    <RewardedAdButton
      ad={ad}
      label={`광고 보고 물고기 ${rewardPerQuiz}마리 받기`}
      incompleteMessage="광고를 끝까지 보면 물고기를 받을 수 있어요"
      variant="default"
      isPending={isPending}
      onReward={() => mutate(quizId)}
    />
  );
}
