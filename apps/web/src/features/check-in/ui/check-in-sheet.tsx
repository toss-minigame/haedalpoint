import { useQuery } from '@tanstack/react-query';
import { ChevronUpIcon } from 'lucide-react';
import { type TouchEvent, useRef, useState } from 'react';
import { type AttendanceStatus, attendanceQueries, formatReward } from '@/entities/attendance';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { cn } from '@/shared/lib/utils';
import { AttendanceIcon } from '@/shared/ui/reward-icons';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { AttendanceDetails } from './attendance-details';

/** 이만큼 위로 밀면 출석 현황을 연다 (px) */
const SWIPE_OPEN_PX = 24;

type Props = {
  ad: RewardedAd;
  className?: string;
};

/** 접힌 줄 오른쪽 한 줄 요약 */
function summaryOf(status: AttendanceStatus | undefined): string {
  if (!status) return '불러오는 중';
  if (status.checkedToday) return `${status.attendanceDays}일째 출석 완료`;
  return `오늘 출석하면 ${formatReward(status.nextReward)}`;
}

function AttendanceBadge({ showDot }: { showDot: boolean }) {
  return (
    <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
      <AttendanceIcon className="size-6" />
      {showDot && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card"
        />
      )}
    </span>
  );
}

// 홈 맨 아래 출석체크: 평소에는 머리 줄(아이콘 · 출석체크 · 한 줄 요약)만 두고, 누르거나 위로 밀면
// 아래에서 출석 현황이 올라온다. 오늘 아직 출석하지 않았으면 아이콘에 빨간 점을 붙인다 (다른 리워드 아이콘과 같다).
// 장면(해달)이 넉넉하도록 출석 현황을 접어 둔다.
export function CheckInSheet({ ad, className }: Props) {
  const { data: status, isError, error } = useQuery(attendanceQueries.me());
  const [isOpen, setIsOpen] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const needsCheckIn = status !== undefined && !status.checkedToday;
  const summary = summaryOf(status);

  const handleTouchStart = (event: TouchEvent) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };
  const handleTouchMove = (event: TouchEvent) => {
    const startY = touchStartY.current;
    const y = event.touches[0]?.clientY;
    if (startY === null || y === undefined || startY - y < SWIPE_OPEN_PX) return;
    touchStartY.current = null;
    setIsOpen(true);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`출석체크, ${summary}. 출석 현황 열기`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className={cn(
            'flex w-full flex-col items-stretch gap-2 rounded-3xl border bg-card px-5 pt-2 pb-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-muted/40',
            className,
          )}
        >
          {/* 위로 밀 수 있다는 손잡이 */}
          <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border" />
          <span className="flex items-center gap-2">
            <AttendanceBadge showDot={needsCheckIn} />
            <span className="text-lg font-bold whitespace-nowrap">출석체크</span>
            <span
              className={cn(
                'ml-auto min-w-0 truncate text-[13px] font-medium',
                needsCheckIn ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {summary}
            </span>
            <ChevronUpIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-w-xl gap-0 rounded-t-3xl border-0 pb-[max(2.125rem,env(safe-area-inset-bottom))]"
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
        <SheetHeader className="flex-row items-center gap-2 border-b px-6 pt-4 pb-3">
          <AttendanceBadge showDot={false} />
          <SheetTitle className="text-lg font-bold">출석체크</SheetTitle>
          <SheetDescription className="sr-only">
            누적 출석 일수와 이번 7일 출석 현황, 출석 버튼
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 pt-4">
          {isError && <p className="text-[15px] text-destructive">{error.message}</p>}
          {status && <AttendanceDetails status={status} ad={ad} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
