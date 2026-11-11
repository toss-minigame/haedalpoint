import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { Spinner } from '@/shared/ui/spinner';
import { useStoreFish } from '../api/use-store-fish';

const BUTTON_CLASS = 'h-12 w-full text-base';
const PENDING_LABEL = '저장하고 있어요';

type Props = {
  /** 해먹에 1마리 이상 있을 때만 저장할 수 있다 */
  canStore: boolean;
  ad: RewardedAd;
  /** 저장한 뒤 넘친 물고기를 다시 잡아올 수 있을 때. 다시 잡아오기 창을 띄웠으면 true */
  onCatchBackAvailable?: (storedFish: number) => boolean;
};

// 광고를 끝까지 보면 해먹의 물고기를 창고에 저장한다.
// 광고를 쓸 수 없는 환경이거나 불러오지 못하면 광고 없이 저장한다 (내 물고기를 저장하지 못하는 막다른 화면을 만들지 않는다).
export function StoreFishButton({ canStore, ad, onCatchBackAvailable }: Props) {
  const { mutate, isPending } = useStoreFish(onCatchBackAvailable);
  const isAdUnavailable = ad.status === 'unsupported' || ad.status === 'failed';

  if (!canStore || isAdUnavailable) {
    return (
      <Button
        type="button"
        size="lg"
        className={BUTTON_CLASS}
        // isPending 동안 비활성화해 더블 탭 방어 (서버 행 잠금이 최종 방어선)
        disabled={!canStore || isPending}
        onClick={() => mutate()}
      >
        {isPending && <Spinner />}
        {isPending ? PENDING_LABEL : '창고에 저장하기'}
      </Button>
    );
  }

  return (
    <RewardedAdButton
      ad={ad}
      label="광고 보고 창고에 저장하기"
      incompleteMessage="광고를 끝까지 보면 창고에 저장할 수 있어요"
      variant="default"
      isPending={isPending}
      pendingLabel={PENDING_LABEL}
      onReward={() => mutate()}
    />
  );
}
