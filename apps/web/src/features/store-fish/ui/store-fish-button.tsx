import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useStoreFish } from '../api/use-store-fish';

const BUTTON_CLASS = 'h-12 w-full text-base';
const PENDING_LABEL = '저장하고 있어요';

type Props = {
  /** 해먹에 1마리 이상 있을 때만 저장할 수 있다 (화면은 정수로 내림해 보여주므로 0마리로 보일 때는 막는다) */
  canStore: boolean;
  ad: RewardedAd;
  /** 저장한 뒤 넘친 물고기를 다시 잡아올 수 있을 때. 다시 잡아오기 창을 띄웠으면 true */
  onCatchBackAvailable?: (storedFish: number) => boolean;
};

const LABEL = '광고 보고 창고에 저장하기';

// 광고를 끝까지 봐야만 해먹의 물고기를 창고에 저장한다 (광고 없이 저장하는 경로는 없다).
// 광고를 쓸 수 없는 환경이면 버튼을 막고, 불러오지 못했으면 다시 불러오기만 할 수 있다 (RewardedAdButton).
export function StoreFishButton({ canStore, ad, onCatchBackAvailable }: Props) {
  const { mutate, isPending } = useStoreFish({ onCatchBackAvailable });

  if (!canStore) {
    return (
      <Button type="button" size="lg" className={BUTTON_CLASS} disabled>
        {LABEL}
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label={LABEL}
      incompleteMessage="광고를 끝까지 보면 창고에 저장할 수 있어요"
      variant="default"
      isPending={isPending}
      pendingLabel={PENDING_LABEL}
      onReward={() => mutate()}
    />
  );
}
