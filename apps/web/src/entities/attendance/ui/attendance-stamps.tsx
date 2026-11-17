import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatReward, formatRewardShort } from '../lib/format-reward';
import type { AttendanceReward } from '../model/types';

/** 출석 칸 하나 (누적 출석 일차) */
export type AttendanceStamp = { day: number; checked: boolean; reward: AttendanceReward };

type Props = {
  /** 이번 7일 묶음 (1~7일차, 8~14일차 …) */
  stamps: AttendanceStamp[];
  /** 다음에 출석할 일차 (글자를 굵게). 오늘 출석했으면 없음 */
  nextDay: number | null;
};

const DAYS = 7;

// 7일 묶음 출석 현황 (Figma attendance-card). 윗줄 "N일차", 아랫줄 동그라미:
// 출석한 날은 연한 띠 위에 체크, 아직인 날은 그날 보상(1원·친구·강화)을 보여준다. 앞에서부터 차례로 채워진다
export function AttendanceStamps({ stamps, nextDay }: Props) {
  const checkedDays = stamps.filter((stamp) => stamp.checked).length;

  return (
    <div className="rounded-2xl bg-muted/60 px-1.5 py-2">
      <ol className="grid grid-cols-7" aria-label="출석 현황">
        {stamps.map(({ day, checked, reward }) => (
          <li
            key={day}
            aria-label={`${day}일차 ${formatReward(reward)} ${checked ? '출석 완료' : '미출석'}`}
            className={cn(
              'pb-2 text-center text-[13px] leading-none text-muted-foreground',
              day === nextDay && 'font-bold text-foreground',
            )}
          >
            {day}일차
          </li>
        ))}
      </ol>
      <div aria-hidden className="relative grid grid-cols-7 justify-items-center">
        {/* 출석한 날들을 잇는 연한 띠 */}
        {checkedDays > 0 && (
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-primary/10"
            style={{ width: `${(checkedDays / DAYS) * 100}%` }}
          />
        )}
        {stamps.map(({ day, checked, reward }) => {
          const isOtterDay = reward.type === 'OTTER_FRIEND';
          return (
            <span
              key={day}
              className={cn(
                'relative grid size-9 place-items-center rounded-full text-[13px] font-semibold',
                checked
                  ? 'text-primary'
                  : 'border border-dashed border-border bg-card text-foreground',
                isOtterDay && !checked && 'border-solid border-primary text-primary',
              )}
            >
              {checked ? (
                <CheckIcon className="size-4" strokeWidth={3} />
              ) : (
                formatRewardShort(reward)
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
