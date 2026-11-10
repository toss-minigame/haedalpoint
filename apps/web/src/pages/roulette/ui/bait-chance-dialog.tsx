import type { BaitRouletteFish } from '@/entities/roulette';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog';

type Props = {
  month: number;
  fishes: BaitRouletteFish[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// 이달 미끼마다 달았을 때의 낚시 속도 효과
export function BaitChanceDialog({ month, fishes, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{month}월 미끼 효과</DialogTitle>
        <DialogDescription className="text-sm">
          미끼를 달면 오늘 자정까지 낚시 속도가 올라가요. 미끼는 달마다 바뀌어요.
        </DialogDescription>
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm text-muted-foreground">
              <th className="pb-2 font-normal">미끼</th>
              <th className="pb-2 text-right font-normal">낚시 속도</th>
            </tr>
          </thead>
          <tbody>
            {fishes.map((fish) => (
              <tr key={fish.code} className="border-t border-border">
                <td className="py-3 font-medium">{fish.name}</td>
                <td className="py-3 text-right tabular-nums">+{fish.speedBonusPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg" className="h-12 w-full text-base">
            닫기
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
