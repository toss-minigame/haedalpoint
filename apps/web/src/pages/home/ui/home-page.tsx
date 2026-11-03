import { Link } from 'react-router';
import { OtterScene } from '@/entities/otter';
import { env } from '@/shared/config/env';
import { useRewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { AttendanceSection } from './attendance-section';
import { FishingSection } from './fishing-section';

export function HomePage() {
  // 같은 광고 그룹은 한 번에 하나만 미리 불러올 수 있어, 홈의 보상형 광고 버튼이 모두 이 광고를 함께 쓴다
  const rewardedAd = useRewardedAd(env.rewardedAdGroupId);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-bold">해달해달</h1>
      <OtterScene />
      <FishingSection rewardedAd={rewardedAd} />
      <AttendanceSection rewardedAd={rewardedAd} />
      <Button asChild size="lg" variant="outline" className="h-12 w-full text-base">
        <Link to="/quiz">오늘의 O/X 퀴즈 풀기</Link>
      </Button>
    </main>
  );
}
