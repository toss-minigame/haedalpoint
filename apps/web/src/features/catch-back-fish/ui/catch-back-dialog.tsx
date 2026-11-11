import { formatFish } from '@/entities/fishing';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog';
import { RewardedAdButton } from '@/shared/ui/rewarded-ad-button';
import { useCatchBack } from '../api/use-catch-back';

type Props = {
  /** 방금 창고에 저장한 양. null 이면 창을 닫는다 */
  storedFish: number | null;
  onClose: () => void;
  ad: RewardedAd;
};

const CLOSE_BUTTON_CLASS = 'h-12 w-full text-base';

// 저장한 직후, 해먹이 가득 차서 넘친 물고기가 있었을 때 뜨는 창. 저장 결과도 이 창 맨 위에 함께 보여준다.
// 넘친 양은 보여주지 않는다. 광고를 끝까지 보면 해달이 일부를 다시 잡아와 방금 비운 해먹에 넣는다.
export function CatchBackDialog({ storedFish, onClose, ad }: Props) {
  const { mutate, isPending } = useCatchBack();

  return (
    <Dialog open={storedFish !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {storedFish !== null && (
          <p className="text-sm text-muted-foreground">
            물고기 {formatFish(storedFish)}마리를 창고에 저장했어요
          </p>
        )}
        <DialogTitle>해먹이 가득 차서 물고기가 넘쳤어요</DialogTitle>
        <DialogDescription className="text-[15px] break-keep">
          광고를 보면 해달이 넘친 물고기 일부를 다시 잡아와요.
        </DialogDescription>
        <div className="flex flex-col gap-2">
          <RewardedAdButton
            ad={ad}
            label="광고 보고 다시 잡아오기"
            incompleteMessage="광고를 끝까지 보면 해달이 물고기를 다시 잡아와요"
            variant="default"
            pendingLabel="다시 잡아오는 중"
            isPending={isPending}
            onReward={() => mutate(undefined, { onSettled: onClose })}
          />
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="lg" className={CLOSE_BUTTON_CLASS}>
              괜찮아요
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
