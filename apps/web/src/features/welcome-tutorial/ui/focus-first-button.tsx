import { type ReactNode, useEffect, useRef } from 'react';

type Props = {
  children: ReactNode;
};

// 처음 그려질 때 안의 첫 버튼으로 초점을 옮긴다. 단계마다 key 를 바꿔 새로 그리면,
// 화면 낭독기와 키보드로도 이어서 할 수 있다. 버튼이 없으면 빈 칸을 남기지 않는다
export function FocusFirstButton({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={ref} className="flex flex-col gap-2 empty:hidden">
      {children}
    </div>
  );
}
