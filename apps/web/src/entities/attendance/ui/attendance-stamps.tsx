import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatReward, formatRewardShort } from '../lib/format-reward';
import type { AttendanceWeekStamp } from '../model/types';

type Props = {
  firstWeek: AttendanceWeekStamp[];
};

// 첫 주 1~7일차 출석 도장. 칸마다 그날 보상을 짧게 보여준다 (해달 친구 날은 해달 그림)
export function AttendanceStamps({ firstWeek }: Props) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="첫 주 출석 도장">
      {firstWeek.map(({ day, checked, reward }) => {
        const isOtterDay = reward.type === 'OTTER_FRIEND';
        return (
          <li
            key={day}
            aria-label={`${day}일째 ${formatReward(reward)} ${checked ? '출석 완료' : '미출석'}`}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border',
              checked
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent bg-muted text-foreground',
              isOtterDay && !checked && 'border-dashed border-primary/60 bg-secondary',
            )}
          >
            <span
              aria-hidden
              className="flex h-4 items-center text-[13px] leading-none font-semibold"
            >
              {isOtterDay ? (
                <span className="font-emoji text-base">🦦</span>
              ) : checked ? (
                <CheckIcon className="size-4" strokeWidth={3} />
              ) : (
                `${day}일`
              )}
            </span>
            <span aria-hidden className="text-[13px] leading-none opacity-80">
              {formatRewardShort(reward)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
