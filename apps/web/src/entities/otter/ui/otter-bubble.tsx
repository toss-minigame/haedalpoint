import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { OTTER_BUBBLE_SPRITE } from '../lib/otter-sprites';

type Props = {
  /** 해달이 하는 말. 바뀔 때마다 화면 낭독기가 읽는다 */
  message: ReactNode;
  /** 말풍선 아래 버튼 등 */
  children?: ReactNode;
  className?: string;
};

// 해달이 말을 거는 말풍선: 왼쪽에 해달 얼굴, 오른쪽에 한두 줄 말. 튜토리얼과 첫 안내에서 쓴다
export function OtterBubble({ message, children, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-lg', className)}>
      <div className="flex items-center gap-3">
        {/* 장식용: 말풍선 글이 같은 내용을 전한다 */}
        <img src={OTTER_BUBBLE_SPRITE} alt="" className="size-12 shrink-0 object-contain" />
        <p
          aria-live="polite"
          className="min-w-0 text-base leading-snug font-medium break-keep whitespace-pre-line"
        >
          {message}
        </p>
      </div>
      {children}
    </div>
  );
}
