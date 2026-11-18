import type { FishingStatus } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useAdFreezeFriend } from '../api/use-fishing-ad-boosts';

type Props = {
  status: FishingStatus;
  ad: RewardedAd;
};

// 녹고 있는 눈사람 친구의 말풍선 안에 넣는 내용 (docs/design/snowman-friend.md).
// 광고를 끝까지 보면 눈사람을 얼려 더 머물게 한다. 광고가 나온다는 것을 누르기 전에 알 수 있게 버튼에 적는다.
export function FriendFreezeBubble({ status, ad }: Props) {
  const { mutate, isPending } = useAdFreezeFriend();
  const hours = status.otterFriendFreezeHours;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-[15px] leading-snug font-semibold break-keep">
        눈사람을 도와주세요!
      </p>
      <RewardedAdButton
        ad={ad}
        label={`광고 보고 얼려주기 · ${hours}시간 더`}
        accessibleLabel={`광고 보고 눈사람 친구 얼려주기 (${hours}시간 더 함께 낚시)`}
        incompleteMessage="광고를 끝까지 보면 눈사람을 얼릴 수 있어요"
        variant="default"
        compact
        pendingLabel="얼리는 중"
        isPending={isPending}
        onReward={() => mutate()}
      />
    </div>
  );
}
