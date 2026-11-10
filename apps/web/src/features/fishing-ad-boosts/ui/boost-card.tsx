import type { ReactNode } from 'react';

type Props = {
  title: string;
  /** 강화 효과 (예: 속도 +1%) */
  effect: string;
  /** 광고 버튼 또는 막힌 버튼 */
  action: ReactNode;
};

// 해달 장면 위에 두 장씩 나란히 놓는 광고 강화 카드 (제목 · 효과 · 버튼).
// 나란히 놓인 카드끼리 버튼 높이가 맞도록 버튼은 카드 아래쪽에 붙인다
export function BoostCard({ title, effect, action }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl bg-card p-3 text-center ring-1 ring-foreground/10">
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{effect}</p>
      <div className="mt-auto w-full pt-1">{action}</div>
    </div>
  );
}
