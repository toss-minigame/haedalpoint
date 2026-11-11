import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  type FishingStatus,
  fishingQueries,
  formatFish,
  otterFriendFishPerHour,
} from '@/entities/fishing';
import {
  CATCH_INTERVAL_SECONDS,
  FRIEND_CATCH_INTERVAL_SECONDS,
  OtterScene,
} from '@/entities/otter';
import { currentKstMonth } from '@/entities/roulette';
import { TodayBoost } from '@/features/today-boost';
import { env } from '@/shared/config/env';
import { useRewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { AttendanceSection } from './attendance-section';
import { FishingBoostSection } from './fishing-boost-section';
import { FishingSection } from './fishing-section';

const SECONDS_PER_HOUR = 60 * 60;
// 화면 바탕이 연한 하늘색이라 강화 버튼과 같이 흰 바탕 + 바다색 테두리로 경계를 드러낸다
const SHORTCUT_CLASS =
  'h-14 w-full rounded-2xl border-primary/40 bg-card text-base font-semibold hover:bg-secondary';

type CatchLabels = { otter: string | null; friend: string | null };

const NO_CATCH_LABELS: CatchLabels = { otter: null, friend: null };

/**
 * 해달·해달 친구가 한 번 잡을 때 늘어나는 양 (예: +0.0000208). 해먹이 가득 찼으면 늘지 않으므로 띄우지 않는다.
 * 친구가 있으면 친구 몫(친구 속도 보너스)은 친구가 들어 올릴 때 따로 띄우고 해달 몫에서는 뺀다.
 * 그래서 두 글자를 시간당으로 더하면 실제로 쌓이는 양과 같다.
 */
function catchLabelsOf(status: FishingStatus | undefined): CatchLabels {
  if (!status || status.hammockFullAt === null) return NO_CATCH_LABELS;
  const friendFishPerHour = status.otterFriendActive ? otterFriendFishPerHour(status) : 0;
  const perCatch = (fishPerHour: number, seconds: number) =>
    `+${formatFish((fishPerHour * seconds) / SECONDS_PER_HOUR)}`;
  return {
    otter: perCatch(status.fishPerHour - friendFishPerHour, CATCH_INTERVAL_SECONDS),
    friend:
      friendFishPerHour > 0 ? perCatch(friendFishPerHour, FRIEND_CATCH_INTERVAL_SECONDS) : null,
  };
}

export function HomePage() {
  // 같은 광고 그룹은 한 번에 하나만 미리 불러올 수 있어, 홈의 보상형 광고 버튼이 모두 이 광고를 함께 쓴다
  const rewardedAd = useRewardedAd(env.rewardedAdGroupId);
  const { data: fishingStatus } = useQuery(fishingQueries.me());
  const catchLabels = catchLabelsOf(fishingStatus);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* 앱인토스 상단 바가 앱 이름을 보여주므로 화면에는 그리지 않고 낭독기용으로만 둔다 */}
      <h1 className="sr-only">해달해달</h1>
      <FishingBoostSection rewardedAd={rewardedAd} />
      {/* 오늘의 강화 버튼은 장면(버튼) 안이 아니라 형제로 두고 왼쪽 위에 겹친다 */}
      <div className="relative">
        <OtterScene
          catchLabel={catchLabels.otter}
          withOtterFriend={fishingStatus?.otterFriendActive ?? false}
          friendCatchLabel={catchLabels.friend}
        />
        <TodayBoost className="absolute top-1 left-1" />
      </div>
      <FishingSection rewardedAd={rewardedAd} />
      <AttendanceSection rewardedAd={rewardedAd} />
      <nav aria-label="오늘 할 일" className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" variant="outline" className={SHORTCUT_CLASS}>
          <Link to="/quiz">O/X 퀴즈 풀기</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className={SHORTCUT_CLASS}>
          <Link to="/roulette">{currentKstMonth()}월 미끼 룰렛</Link>
        </Button>
      </nav>
    </main>
  );
}
