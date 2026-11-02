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
              'flex aspect-square flex-col items-center justify-center rounded-lg border text-xs',
              checked ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted/40',
              isOtterDay && !checked && 'border-dashed border-primary/60',
            )}
          >
            <span aria-hidden className="text-base leading-none">
              {isOtterDay ? '🦦' : checked ? '✓' : day}
            </span>
            <span aria-hidden className="mt-1 text-[10px] leading-none opacity-80">
              {isOtterDay ? '친구' : `${day}일`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
