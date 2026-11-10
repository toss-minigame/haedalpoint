import type { ReactNode } from 'react';

type Props = {
  title: string;
  /** 강화 효과 (예: +1%). 카드에서 가장 크게 보인다 */
  value: string;
  /** 효과가 무엇에 붙는지 (예: 낚시 속도) */
  caption: string;
  /** 광고 버튼 또는 막힌 버튼 */
  action: ReactNode;
};

/** 카드 안 버튼 크기 (터치 영역 44px) */
export const BOOST_BUTTON_CLASS = 'h-11 w-full text-[15px]';

// 해달 장면 위에 두 장씩 나란히 놓는 광고 강화 카드 (제목 · 효과 · 버튼).
// 나란히 놓인 카드끼리 버튼 높이가 맞도록 버튼은 카드 아래쪽에 붙인다
export function BoostCard({ title, value, caption, action }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
        <p className="truncate text-[13px] text-muted-foreground">{caption}</p>
      </div>
      <div className="mt-auto w-full">{action}</div>
    </div>
  );
}
