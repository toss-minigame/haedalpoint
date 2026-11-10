import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { RewardedAd, RewardedAdStatus } from '@/shared/lib/rewarded-ad';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

const AD_BUTTON_CLASS = 'h-12 w-full text-base';
const COMPACT_AD_BUTTON_CLASS = 'h-11 w-full text-[15px]';

// 광고 상태별 버튼 문구. ready 일 때만 원래 문구를 쓴다.
const STATUS_LABEL: Record<Exclude<RewardedAdStatus, 'ready'>, string> = {
  unsupported: '이 환경에서는 광고를 볼 수 없어요',
  loading: '광고를 준비하고 있어요',
  showing: '광고를 보는 중이에요',
  failed: '광고를 불러오지 못했어요 · 다시 시도',
};

// 좁은 카드 안에 들어가는 짧은 문구
const COMPACT_STATUS_LABEL: Record<Exclude<RewardedAdStatus, 'ready'>, string> = {
  unsupported: '광고 없음',
  loading: '광고 준비 중',
  showing: '광고 보는 중',
  failed: '다시 시도',
};

type Props = {
  ad: RewardedAd;
  label: string;
  /** 광고를 끝까지 보지 않고 닫았을 때 안내 */
  incompleteMessage: string;
  isPending: boolean;
  /** 보상을 처리하는 동안의 문구 (스피너와 함께 보인다) */
  pendingLabel?: string;
  variant: 'default' | 'outline' | 'secondary';
  /** 좁은 카드용 작은 버튼과 짧은 상태 문구 */
  compact?: boolean;
  /** label 이 짧아 무엇을 하는지 드러나지 않을 때 화면 낭독기가 읽을 문구 (광고를 볼 수 있을 때만 쓴다) */
  accessibleLabel?: string;
  /** 버튼 모양을 바꿀 때 덧붙이는 클래스 */
  className?: string;
  /** 문구(label·상태·처리 중)를 감싸 그린다. 주면 스피너도 이 안에서 그린다 */
  renderLabel?: (text: string, isPending: boolean) => ReactNode;
  onReward: () => void;
};

// 보상형 광고 버튼 공통 동작: 광고를 끝까지 봤을 때(`userEarnedReward`)만 onReward 를 부른다.
export function RewardedAdButton({
  ad,
  label,
  incompleteMessage,
  isPending,
  pendingLabel = '처리하고 있어요',
  variant,
  compact = false,
  accessibleLabel,
  className,
  renderLabel,
  onReward,
}: Props) {
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

  const isReady = !isPending && status === 'ready';
  const statusLabel = compact ? COMPACT_STATUS_LABEL : STATUS_LABEL;
  const text = isPending ? pendingLabel : status === 'ready' ? label : statusLabel[status];

  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className={cn(compact ? COMPACT_AD_BUTTON_CLASS : AD_BUTTON_CLASS, className)}
      aria-label={isReady ? accessibleLabel : undefined}
      disabled={!isEnabled}
      onClick={handleClick}
    >
      {renderLabel ? (
        renderLabel(text, isPending)
      ) : (
        <>
          {isPending && <Spinner />}
          {text}
        </>
      )}
    </Button>
  );
}
