import { Spinner } from '@/shared/ui/spinner';

/**
 * 해달 장면 위에 두 개씩 나란히 놓는 광고 강화 버튼 모양 (두 줄, 터치 영역 44px 이상).
 * 화면 바탕이 연한 하늘색이라 흰 바탕 + 바다색 테두리로 경계를 드러낸다
 */
export const BOOST_BUTTON_CLASS =
  'h-auto min-h-16 min-w-0 flex-1 flex-col gap-0.5 rounded-2xl border-primary/40 bg-card px-3 py-3 whitespace-normal hover:bg-secondary';

type Props = {
  title: string;
  /** 강화 효과 (예: +1%) */
  value: string;
  /** 버튼 상태 문구 (예: 광고 보기, 18분 뒤 가능) */
  status: string;
  isPending?: boolean;
};

// 광고 강화 버튼 안의 두 줄: 윗줄은 무엇이 얼마나 오르는지, 아랫줄은 지금 누를 수 있는지
export function BoostButtonLabel({ title, value, status, isPending = false }: Props) {
  return (
    <>
      <span className="text-[15px] font-semibold">
        {title} <span className="text-primary tabular-nums">{value}</span>
      </span>
      <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
        {isPending && <Spinner />}
        {status}
      </span>
    </>
  );
}
