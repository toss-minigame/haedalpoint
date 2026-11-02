import { toast } from 'sonner';
import type { RewardedAd, RewardedAdStatus } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { useClaimQuizReward, useUnlockQuizRetry } from '../api/use-quiz-ad-mutations';

const AD_BUTTON_CLASS = 'h-12 w-full text-base';

// 광고 상태별 버튼 문구. ready 일 때만 원래 문구를 쓴다.
const STATUS_LABEL: Record<Exclude<RewardedAdStatus, 'ready'>, string> = {
  unsupported: '이 환경에서는 광고를 볼 수 없어요',
  loading: '광고를 준비하고 있어요',
  showing: '광고를 보는 중이에요',
  failed: '광고를 불러오지 못했어요 · 다시 시도',
};

type AdActionButtonProps = {
  ad: RewardedAd;
  label: string;
  /** 광고를 끝까지 보지 않고 닫았을 때 안내 */
  incompleteMessage: string;
  isPending: boolean;
  variant: 'default' | 'outline';
  onReward: () => void;
};

// 보상형 광고 버튼 공통 동작: 광고를 끝까지 봤을 때(`userEarnedReward`)만 onReward 를 부른다.
function AdActionButton({
  ad,
  label,
  incompleteMessage,
  isPending,
  variant,
  onReward,
}: AdActionButtonProps) {
  const { status } = ad;
  const isFailed = status === 'failed';
  const isEnabled = !isPending && (status === 'ready' || isFailed);

  const handleClick = () => {
    if (isFailed) {
      ad.reload();
      return;
    }
    ad.show({
      onReward,
      onClose: (earned) => {
        if (!earned) toast.info(incompleteMessage);
      },
      onFail: () => toast.error('광고를 보여주지 못했어요. 잠시 후 다시 시도해 주세요.'),
    });
  };

  const text = isPending ? '처리하고 있어요' : status === 'ready' ? label : STATUS_LABEL[status];

  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className={AD_BUTTON_CLASS}
      disabled={!isEnabled}
      onClick={handleClick}
    >
      {text}
    </Button>
  );
}

type QuizAdButtonProps = {
  quizId: string;
  ad: RewardedAd;
};

export function RetryAdButton({ quizId, ad }: QuizAdButtonProps) {
  const { mutate, isPending } = useUnlockQuizRetry();

  return (
    <AdActionButton
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
    <AdActionButton
      ad={ad}
      label={`광고 보고 낚싯대 강화하기 (+${speedBonusPercent}%)`}
      incompleteMessage="광고를 끝까지 보면 낚싯대를 강화할 수 있어요"
      variant="default"
      isPending={isPending}
      onReward={() => mutate(quizId)}
    />
  );
}
