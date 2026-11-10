import type { SVGProps } from 'react';

// 가리비 조개. 오늘의 강화처럼 바다 테마의 작은 표시에 쓴다 (장식이라 낭독기에서는 숨긴다)
export function ShellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3C7 3 3 7.2 3 12.2c0 3.2 1.6 5.5 4 6.8h10c2.4-1.3 4-3.6 4-6.8C21 7.2 17 3 12 3Z"
        fill="#fde2c8"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M12 3v16M7.5 4.6 9 19M16.5 4.6 15 19M4 9.5l5 9.5M20 9.5l-5 9.5"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path d="M9.5 19h5v2h-5z" fill="currentColor" />
    </svg>
  );
}
