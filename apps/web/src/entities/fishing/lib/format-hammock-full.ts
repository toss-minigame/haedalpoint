const MINUTE_MS = 60 * 1000;
const MINUTES_PER_HOUR = 60;

const clockFormatter = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });

/** 남은 시간을 'N시간 M분' 으로. 1분 미만은 '1분 미만' */
export function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / MINUTE_MS);
  if (totalMinutes < 1) return '1분 미만';
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

/** 가득 차는 시각을 '오후 7:42' 로. 오늘이 아니면 앞에 '내일' 을 붙인다 (해먹은 하루 안에 가득 찬다) */
export function formatFullAt(fullAt: Date, now: Date): string {
  const clock = clockFormatter.format(fullAt);
  return fullAt.toDateString() === now.toDateString() ? clock : `내일 ${clock}`;
}
