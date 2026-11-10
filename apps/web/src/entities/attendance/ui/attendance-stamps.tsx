import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { AttendanceCycleStamp } from '../model/types';

const OTTER_FRIEND_DAY = 7;

type Props = {
  cycle: AttendanceCycleStamp[];
};

export function AttendanceStamps({ cycle }: Props) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="7일 출석 스탬프">
      {cycle.map(({ day, checked }) => {
        const isOtterDay = day === OTTER_FRIEND_DAY;
        return (
          <li
            key={day}
            aria-label={`${day}일차${isOtterDay ? ' 해달 친구' : ''} ${checked ? '출석 완료' : '미출석'}`}
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
              className="flex h-4 items-center text-base leading-none font-semibold"
            >
              {isOtterDay ? (
                <span className="font-emoji">🦦</span>
              ) : checked ? (
                <CheckIcon className="size-4" strokeWidth={3} />
              ) : (
                day
              )}
            </span>
            <span aria-hidden className="text-[13px] leading-none opacity-80">
              {isOtterDay ? '친구' : `${day}일`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
