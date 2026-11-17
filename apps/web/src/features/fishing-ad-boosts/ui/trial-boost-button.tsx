import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { BOOST_BUTTON_CLASS, BoostButtonLabel } from './boost-button-label';

/** 튜토리얼 체험: 광고 대신 이 동작으로 한 번 강화한다 (쿨타임과 상관없이 누를 수 있다) */
export type BoostTrial = { onTry: () => void; isPending: boolean };

type Props = {
  icon: ReactNode;
  title: string;
  /** 아랫줄 문구 (예: 광고 없이) */
  label: string;
  /** 낭독기가 읽을 문구 (예: 광고 없이 낚싯대 강화하기) */
  accessibleLabel: string;
  pendingLabel: string;
  trial: BoostTrial;
};

// 광고 강화 버튼과 같은 모양이지만 광고를 띄우지 않는다
export function TrialBoostButton({
  icon,
  title,
  label,
  accessibleLabel,
  pendingLabel,
  trial,
}: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={BOOST_BUTTON_CLASS}
      aria-label={trial.isPending ? undefined : accessibleLabel}
      disabled={trial.isPending}
      onClick={trial.onTry}
    >
      <BoostButtonLabel
        icon={icon}
        title={title}
        status={trial.isPending ? pendingLabel : label}
        isAvailable={!trial.isPending}
        isPending={trial.isPending}
      />
    </Button>
  );
}
