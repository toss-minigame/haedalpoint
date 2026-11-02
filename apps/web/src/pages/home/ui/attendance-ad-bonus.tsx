import { AdBonusButton } from '@/features/check-in';
import { env } from '@/shared/config/env';
import { useRewardedAd } from '@/shared/lib/rewarded-ad';

// 오늘 광고 보너스를 받을 수 있을 때만 화면에 붙어 보상형 광고를 미리 불러온다.
// (버튼을 누를 때 불러오지 않는다. 보너스를 받으면 사라지면서 광고 콜백도 정리된다)
export function AttendanceAdBonus() {
  const rewardedAd = useRewardedAd(env.rewardedAdGroupId);
  return <AdBonusButton ad={rewardedAd} />;
}
