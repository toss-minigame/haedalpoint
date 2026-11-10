import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import { fishingQueries, formatFish } from '@/entities/fishing';
import { CATCH_INTERVAL_SECONDS, OtterScene } from '@/entities/otter';
import { TodayBoost } from '@/features/today-boost';
import { env } from '@/shared/config/env';
import { useRewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { AttendanceSection } from './attendance-section';
import { FishingBoostSection } from './fishing-boost-section';
import { FishingSection } from './fishing-section';

const SECONDS_PER_HOUR = 60 * 60;

/** 해달이 한 번 잡을 때 늘어나는 양 (예: +0.0000208). 해먹이 가득 찼으면 늘지 않으므로 띄우지 않는다 */
function useCatchLabel(): string | null {
  const { data: status } = useQuery(fishingQueries.me());
  if (!status || status.hammockFullAt === null) return null;
  return `+${formatFish((status.fishPerHour * CATCH_INTERVAL_SECONDS) / SECONDS_PER_HOUR)}`;
}

export function HomePage() {
  // 같은 광고 그룹은 한 번에 하나만 미리 불러올 수 있어, 홈의 보상형 광고 버튼이 모두 이 광고를 함께 쓴다
  const rewardedAd = useRewardedAd(env.rewardedAdGroupId);
  const catchLabel = useCatchLabel();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* 앱인토스 상단 바가 앱 이름을 보여주므로 화면에는 그리지 않고 낭독기용으로만 둔다 */}
      <h1 className="sr-only">해달해달</h1>
      <FishingBoostSection rewardedAd={rewardedAd} />
      {/* 오늘의 강화 버튼은 장면(버튼) 안이 아니라 형제로 두고 오른쪽 위에 겹친다 */}
      <div className="relative">
        <OtterScene catchLabel={catchLabel} />
        <TodayBoost className="absolute top-3 right-3" />
      </div>
      <FishingSection rewardedAd={rewardedAd} />
      <AttendanceSection rewardedAd={rewardedAd} />
      <Button
        asChild
        size="lg"
        variant="outline"
        className="h-14 w-full justify-between rounded-2xl bg-card px-5 text-base font-semibold"
      >
        <Link to="/quiz">
          오늘의 O/X 퀴즈 풀기
          <ChevronRightIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        </Link>
      </Button>
    </main>
  );
}
