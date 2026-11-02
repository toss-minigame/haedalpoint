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
  /** 광고 1회로 오르는 낚시 속도 (%) */
  speedBonusPercent: number;
};

export function RewardAdButton({ quizId, ad, speedBonusPercent }: RewardAdButtonProps) {
  const { mutate, isPending } = useClaimQuizReward();

  return (
    <RewardedAdButton
      ad={ad}
      label={`광고 보고 낚싯대 강화하기 (+${speedBonusPercent}%)`}
      incompleteMessage="광고를 끝까지 보면 낚싯대를 강화할 수 있어요"
      variant="default"
      isPending={isPending}
      onReward={() => mutate(quizId)}
    />
  );
}
