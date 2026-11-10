import type { BaitRouletteSpin } from '@/entities/roulette';
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
import { useApplyBait } from '../api/use-roulette-mutations';

type Props = {
  spin: BaitRouletteSpin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: RewardedAd;
};

const CLOSE_BUTTON_CLASS = 'h-12 w-full text-base';

// 룰렛이 멈춘 뒤 뜨는 창. 광고를 끝까지 보면 미끼를 달고, 같은 창에서 적용 결과를 보여준다.
// 광고를 보지 않고 닫아도 오늘 자정 전까지는 룰렛 화면에서 다시 달 수 있다.
export function BaitResultDialog({ spin, open, onOpenChange, ad }: Props) {
  const { mutate, isPending } = useApplyBait();
  const isApplied = spin.appliedAt !== null;
  const effect = `낚시 속도 +${spin.speedBonusPercent}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {isApplied ? (
          <>
            <DialogTitle>{spin.fishName} 미끼를 달았어요</DialogTitle>
            <DialogDescription>
              오늘 자정까지 해달이 {spin.speedBonusPercent}% 더 빨리 낚아요.
            </DialogDescription>
            <DialogClose asChild>
              <Button type="button" size="lg" className={CLOSE_BUTTON_CLASS}>
                확인
              </Button>
            </DialogClose>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">오늘의 미끼</p>
              <DialogTitle className="text-2xl">{spin.fishName}</DialogTitle>
            </div>
            <div className="flex items-baseline justify-between rounded-xl bg-muted px-4 py-3">
              <span className="text-base">{effect}</span>
              <span className="text-sm text-muted-foreground">오늘 자정까지</span>
            </div>
            <DialogDescription className="text-sm">
              광고를 끝까지 보면 미끼를 달 수 있어요. 지금 안 달아도 오늘 안에는 다시 달 수 있어요.
            </DialogDescription>
            <div className="flex flex-col gap-2">
              <RewardedAdButton
                ad={ad}
                label="광고 보고 미끼 달기"
                incompleteMessage="광고를 끝까지 보면 미끼를 달 수 있어요"
                variant="default"
                pendingLabel="미끼 다는 중"
                isPending={isPending}
                onReward={() => mutate()}
              />
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="lg" className={CLOSE_BUTTON_CLASS}>
                  다음에 할게요
                </Button>
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
