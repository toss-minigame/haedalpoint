import type { ClaimTossPointResponse } from '@/entities/fishing';
import { formatFish } from '@/entities/fishing';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog';
import { PointCoinIcon } from '@/shared/ui/reward-icons';

type Props = {
  /** 방금 받은 결과. null 이면 창을 닫는다 */
  result: ClaimTossPointResponse | null;
  onClose: () => void;
};

const TITLE: Record<ClaimTossPointResponse['tossPointGrant'], (points: number) => string> = {
  SUCCESS: (points) => `토스 포인트 ${points}원을 받았어요`,
  PENDING: (points) => `토스 포인트 ${points}원을 지급하고 있어요`,
  FAILED: () => '토스 포인트를 지급하지 못했어요',
};

const NOTE: Record<ClaimTossPointResponse['tossPointGrant'], string> = {
  SUCCESS: '토스 앱 혜택 탭의 토스 포인트에서 확인할 수 있어요.',
  PENDING: '지급이 조금 늦어지고 있어요. 창고를 다시 열면 이어서 지급해요.',
  FAILED: '받은 기록은 남아 있어요. 확인한 뒤 다시 지급해 드릴게요.',
};

// 창고 물고기를 토스 포인트로 받은 직후 뜨는 창. 포인트 동전과 함께 얼마가 됐는지 보여준다
export function TossPointClaimedDialog({ result, onClose }: Props) {
  return (
    <Dialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="items-center text-center">
        {result && (
          <>
            <PointCoinIcon className="size-20 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300" />
            <DialogTitle className="break-keep">
              {TITLE[result.tossPointGrant](result.claimedPoints)}
            </DialogTitle>
            <DialogDescription className="flex flex-col gap-1 text-[15px] break-keep">
              <span>
                물고기 {formatFish(result.usedFish)}마리가 토스 포인트 {result.claimedPoints}원이
                됐어요.
              </span>
              <span>{NOTE[result.tossPointGrant]}</span>
            </DialogDescription>
          </>
        )}
        <DialogClose asChild>
          <Button type="button" size="lg" className="h-12 w-full text-base">
            확인
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
