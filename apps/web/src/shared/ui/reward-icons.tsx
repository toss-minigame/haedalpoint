import type { SVGProps } from 'react';

// 홈 리워드 아이콘 (Figma "해달 얼음낚시" mission-card · attendance-card 에서 옮김, 30×30 기준).
// 색은 그림의 일부라 그대로 두고, 흐리게(쿨타임) 보이는 건 감싸는 쪽이 opacity 로 정한다.

type IconProps = SVGProps<SVGSVGElement>;

/** 낚싯대 강화 (빨리 낚기) */
export function RodIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <path d="M5.833 25.833L22.5 5" stroke="#A0703F" strokeWidth={2.667} strokeLinecap="round" />
      <path d="M22.5 5C25 10 25 15.833 23.333 20.833" stroke="#8B95A1" strokeWidth={1.083} />
      <circle cx={10} cy={20.417} r={3.167} fill="#3182F6" />
      <path
        d="M23.333 20.833V23.75a1.667 1.667 0 0 1-3.333 0"
        stroke="#4E5968"
        strokeWidth={1.333}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 해먹 넓히기 (양동이 키우기) */
export function BucketIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <path d="M5 3.5C11.667-.5 18.333-.5 25 3.5" stroke="#4E5968" strokeWidth={1.5} />
      <path d="M4 10.5h22l-2.5 17h-17L4 10.5Z" fill="#6AA8E0" />
      <path d="M4 10.5h22l-.4 3H4.4L4 10.5Z" fill="#4C8FD0" />
      <path
        d="M15 15.5v8m3.5-4.5L15 15.5 11.5 19"
        stroke="#fff"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 양동이 (홈 양동이 카드). 양동이 키우기 아이콘에서 화살표를 뺀 모양 */
export function PailIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <path d="M5 3.5C11.667-.5 18.333-.5 25 3.5" stroke="#4E5968" strokeWidth={1.5} />
      <path d="M4 10.5h22l-2.5 17h-17L4 10.5Z" fill="#6AA8E0" />
      <path d="M4 10.5h22l-.4 3H4.4L4 10.5Z" fill="#4C8FD0" />
    </svg>
  );
}

/** 미끼 룰렛 (미끼 뽑기) */
export function BaitWheelIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <circle cx={15} cy={15.833} r={10.833} fill="#FFE08A" />
      <path d="M15 5a10.833 10.833 0 0 1 10.833 10.833H15V5Z" fill="#F4A940" />
      <path d="M4.167 15.833A10.833 10.833 0 0 0 15 26.667V15.833H4.167Z" fill="#F4A940" />
      <circle cx={15} cy={15.833} r={2.5} fill="#fff" />
      <path d="M12.5 2.083h5L15 5.833l-2.5-3.75Z" fill="#F04452" />
    </svg>
  );
}

/** O/X 퀴즈 */
export function QuizOxIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <circle cx={9.167} cy={15} r={5.417} stroke="#3182F6" strokeWidth={3} />
      <path
        d="M18.333 9.583l7.5 10.834m0-10.834l-7.5 10.834"
        stroke="#F04452"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 오늘의 강화 (오늘 보너스) */
export function GiftIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <rect x={5} y={11.667} width={20} height={14.167} rx={2.5} fill="#F7C948" />
      <rect x={3.333} y={8.333} width={23.333} height={5.833} rx={2.083} fill="#F4A940" />
      <path d="M16.667 8.333h-3.334v17.5h3.334v-17.5Z" fill="#F04452" />
      <path
        d="M9.167 8.333C6.667 5 11.667 3.333 15 8.333c3.333-5 8.333-3.333 5.833 0"
        stroke="#F04452"
        strokeWidth={2}
      />
    </svg>
  );
}

/** 눈사람 친구 (출석 칸). 3D 눈사람(build_snowman.py)과 같은 노란 털모자·파란 목도리·당근 코 */
export function SnowmanIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" fill="none" {...props}>
      <circle cx={15} cy={21.5} r={7} fill="#fff" stroke="#C5D3E2" strokeWidth={1.2} />
      <circle cx={15} cy={11.5} r={5.2} fill="#fff" stroke="#C5D3E2" strokeWidth={1.2} />
      <path d="M9.9 9.2a5.1 5.1 0 0 1 10.2 0Z" fill="#F2C14E" />
      <rect x={9.4} y={8.4} width={11.2} height={2.2} rx={1.1} fill="#E0A93A" />
      <circle cx={15} cy={3.6} r={1.5} fill="#F2C14E" />
      <circle cx={13.1} cy={12.2} r={0.75} fill="#333D4B" />
      <circle cx={16.9} cy={12.2} r={0.75} fill="#333D4B" />
      <path d="M14.6 13.4h1.3l2.9 1-4.2.5Z" fill="#F4A340" />
      <path d="M10.2 16.2c3.2 1.3 6.4 1.3 9.6 0v1.9c-3.2 1.3-6.4 1.3-9.6 0Z" fill="#4F70AE" />
      <path d="M17.2 17.6l1.1 4 1.9-.5-1-3.9Z" fill="#3F5C96" />
      <circle cx={15} cy={21.2} r={0.8} fill="#333D4B" />
      <circle cx={15} cy={24.2} r={0.8} fill="#333D4B" />
    </svg>
  );
}

/** 출석체크 카드 머리 (달력 + 체크) */
export function AttendanceIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x={2} y={4} width={20} height={18} rx={4} fill="#fff" />
      <path d="M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v1H2V8Z" fill="#00BC7D" fillOpacity={0.32} />
      <rect x={6} y={2} width={2} height={5} rx={1} fill="#fff" />
      <rect x={16} y={2} width={2} height={5} rx={1} fill="#fff" />
      <path
        d="M10.03 17.5a1 1 0 0 1-.69-.26l-2.56-2.38a.88.88 0 0 1 0-1.28.98.98 0 0 1 1.38 0l1.87 1.73 3.81-3.55a.98.98 0 0 1 1.37 0 .88.88 0 0 1 0 1.28l-4.5 4.19a1 1 0 0 1-.68.27Z"
        fill="#3082F5"
      />
    </svg>
  );
}
