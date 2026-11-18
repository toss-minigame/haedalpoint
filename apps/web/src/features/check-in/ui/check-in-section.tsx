import { useQuery } from '@tanstack/react-query';
import { ChevronUpIcon } from 'lucide-react';
import type { Ref } from 'react';
import {
  type AttendanceReward,
  type AttendanceStatus,
  attendanceQueries,
  formatReward,
} from '@/entities/attendance';
import type { RewardedAd } from '@/shared/lib/rewarded-ad';
import { cn } from '@/shared/lib/utils';
import { AttendanceIcon } from '@/shared/ui/reward-icons';
import { todayReward } from '../lib/attendance-week';
import { AttendanceDetails } from './attendance-details';

type Props = {
  ad: RewardedAd;
  /** 출석 현황이 펼쳐져 있는지 (홈 아래 카드를 위로 올렸는지) */
  isExpanded: boolean;
  /** 머리 줄을 누르면 펼치거나 접는다 */
  onToggle: () => void;
  /** 접었을 때 화면 밖으로 내려가는 출석 현황 부분. 높이를 재는 데 쓴다 */
  detailsRef?: Ref<HTMLDivElement>;
};

/** 오늘 출석해서 받은 보상을 알리는 말 */
function receivedSummary(reward: AttendanceReward): string {
  switch (reward.type) {
    case 'TOSS_POINT':
      return '토스포인트 지급 완료';
    case 'OTTER_FRIEND':
      return '눈사람 친구가 왔어요';
    case 'ENHANCE_BONUS':
      return '낚싯대 강화 완료';
  }
}

/** 머리 줄 오른쪽 한 줄 요약 */
function summaryOf(status: AttendanceStatus | undefined): string {
  if (!status) return '불러오는 중';
  const received = todayReward(status);
  if (received) return receivedSummary(received);
  return `오늘 출석하면 ${formatReward(status.nextReward)}`;
}

// 홈 아래 카드의 출석체크. 머리 줄(아이콘 · 출석체크 · 한 줄 요약)은 늘 보이고, 출석 현황(detailsRef)은
// 카드를 위로 올렸을 때만 보인다. 오늘 아직 출석하지 않았으면 아이콘에 빨간 점을 붙인다 (다른 리워드 아이콘과 같다)
export function CheckInSection({ ad, isExpanded, onToggle, detailsRef }: Props) {
  const { data: status, isError, error } = useQuery(attendanceQueries.me());
  const needsCheckIn = status !== undefined && !status.checkedToday;
  const summary = summaryOf(status);

  return (
    <section aria-labelledby="attendance-heading" className="rounded-3xl border">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-label={`출석체크, ${summary}. 출석 현황 ${isExpanded ? '접기' : '펼치기'}`}
        onClick={onToggle}
        // 접었을 때 이 줄이 화면 맨 아래에 오므로 아래 안전 영역만큼 띄운다
        className="flex w-full items-center gap-2 rounded-3xl px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
          <AttendanceIcon className="size-6" />
          {needsCheckIn && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-card"
            />
          )}
        </span>
        <h2 id="attendance-heading" className="text-lg font-bold whitespace-nowrap">
          출석체크
        </h2>
        <span
          className={cn(
            'ml-auto min-w-0 truncate text-[13px] font-medium',
            needsCheckIn ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {summary}
        </span>
        <ChevronUpIcon
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            isExpanded && 'rotate-180',
          )}
        />
      </button>
      <div
        ref={detailsRef}
        className="border-t px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {isError && <p className="text-[15px] text-destructive">{error.message}</p>}
        {status && <AttendanceDetails status={status} ad={ad} />}
      </div>
    </section>
  );
}
