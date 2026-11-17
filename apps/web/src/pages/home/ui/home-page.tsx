import { useQuery } from '@tanstack/react-query';
import {
  type FishingStatus,
  fishingQueries,
  formatFish,
  otterFriendFishPerHour,
  useHammockFull,
} from '@/entities/fishing';
import {
  CATCH_INTERVAL_SECONDS,
  FRIEND_CATCH_INTERVAL_SECONDS,
  OtterScene,
} from '@/entities/otter';
import { CheckInSheet } from '@/features/check-in';
import { TodayBoost } from '@/features/today-boost';
import {
  tutorialTarget,
  useWelcomeTutorial,
  WelcomeTutorialOverlay,
} from '@/features/welcome-tutorial';
import { env } from '@/shared/config/env';
import { useRewardedAd } from '@/shared/lib/rewarded-ad';
import { HammockPanel } from './hammock-panel';
import { RewardTiles } from './reward-tiles';
import { WarehouseChip } from './warehouse-chip';

const SECONDS_PER_HOUR = 60 * 60;

type CatchLabels = { otter: string | null; friend: string | null };

const NO_CATCH_LABELS: CatchLabels = { otter: null, friend: null };

/**
 * 해달·해달 친구가 한 번 잡을 때 늘어나는 양 (예: 기본 속도 초당 1마리 · 3초마다 잡으면 +3). 해먹이 가득 찼으면 늘지 않으므로 띄우지 않는다.
 * 친구가 있으면 친구 몫(친구 속도 보너스)은 친구가 들어 올릴 때 따로 띄우고 해달 몫에서는 뺀다.
 * 그래서 두 글자를 시간당으로 더하면 실제로 쌓이는 양과 거의 같다 (화면은 정수로 내림해 보여준다).
 */
function catchLabelsOf(status: FishingStatus | undefined, hammockFull: boolean): CatchLabels {
  if (!status || hammockFull) return NO_CATCH_LABELS;
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
  const { data: fishingStatus, dataUpdatedAt } = useQuery(fishingQueries.me());
  // 가득 차는 시각이 되면 다시 조회하지 않아도 낚시를 멈추고 양동이를 든 모습으로 바뀐다
  const hammockFull = useHammockFull(fishingStatus, dataUpdatedAt);
  const catchLabels = catchLabelsOf(fishingStatus, hammockFull);
  const tutorial = useWelcomeTutorial();

  return (
    <main className="flex min-h-dvh flex-col bg-home-sky-top">
      {/* 앱인토스 상단 바가 앱 이름을 보여주므로 화면에는 그리지 않고 낭독기용으로만 둔다 */}
      <h1 className="sr-only">해달해달</h1>
      {/* 위: 해달 낚시 장면을 화면 가득 배경으로 깔고, 그 위에 창고 · 오늘의 강화 · 리워드 아이콘을 얹는다 */}
      <div className="relative flex min-h-[26rem] flex-1 flex-col" {...tutorialTarget('scene')}>
        <OtterScene
          className="absolute inset-0 h-full"
          catchLabel={catchLabels.otter}
          withOtterFriend={fishingStatus?.otterFriendActive ?? false}
          friendCatchLabel={catchLabels.friend}
          hammockFull={hammockFull}
        />
        {/* 빈 곳을 누르면 아래 장면으로 전달돼 해달이 물고기를 잡는다 */}
        <div className="pointer-events-none relative mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <WarehouseChip className="pointer-events-auto" />
            <TodayBoost className="pointer-events-auto ml-auto" />
          </div>
          <RewardTiles
            className="pointer-events-auto"
            rewardedAd={rewardedAd}
            rodTrial={tutorial?.trialFor('ROD')}
            hammockTrial={tutorial?.trialFor('HAMMOCK')}
          />
        </div>
      </div>
      {/* 아래: 양동이 카드와 접힌 출석체크 줄. 둥근 위 모서리가 장면 아래쪽(눈밭)에 겹쳐 올라온다 */}
      <div className="relative -mt-6 rounded-t-3xl bg-card shadow-[0_-6px_20px_rgb(30_70_120/0.08)]">
        <div className="mx-auto flex max-w-xl flex-col gap-6 px-5 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <HammockPanel rewardedAd={rewardedAd} onTutorialStored={tutorial?.onStored} />
          <div {...tutorialTarget('check-in')}>
            <CheckInSheet ad={rewardedAd} />
          </div>
        </div>
      </div>
      {tutorial && <WelcomeTutorialOverlay tutorial={tutorial} />}
    </main>
  );
}
