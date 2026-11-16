import { Button } from '@/shared/ui/button';
import { BOOST_BUTTON_CLASS, BoostButtonLabel } from './boost-button-label';

/** 튜토리얼 체험: 광고 대신 이 동작으로 한 번 강화한다 (쿨타임과 상관없이 누를 수 있다) */
export type BoostTrial = { onTry: () => void; isPending: boolean };

type Props = {
  title: string;
  value: string;
  /** 버튼 아랫줄 문구 (예: 광고 없이 강화하기) */
  label: string;
  pendingLabel: string;
  trial: BoostTrial;
};

// 광고 강화 버튼과 같은 모양이지만 광고를 띄우지 않는다
export function TrialBoostButton({ title, value, label, pendingLabel, trial }: Props) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className={BOOST_BUTTON_CLASS}
      disabled={trial.isPending}
      onClick={trial.onTry}
    >
      <BoostButtonLabel
        title={title}
        value={value}
        status={trial.isPending ? pendingLabel : label}
        isPending={trial.isPending}
      />
    </Button>
  );
}
