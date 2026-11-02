import { Button } from '@/shared/ui/button';

type Props = {
  isAvailable: boolean;
};

// TODO(ad): 토스 보상형 광고 SDK 연동 시 `userEarnedReward` 수신 후 POST /attendance/ad-bonus 호출.
// 출석 기본 보상과는 독립된 선택 행동이며, 연동 전까지는 항상 비활성 상태로 노출만 한다.
export function AdBonusButton({ isAvailable }: Props) {
  if (!isAvailable) return null;

  return (
    <Button type="button" variant="outline" size="lg" className="h-12 w-full" disabled>
      광고 보고 2배 받기 · 준비 중
    </Button>
  );
}
