const MINUTE_MS = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const fishFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

/** 물고기 수는 정수로 내림해서 보여준다 (소수점은 서버가 이어서 센다) */
export function formatFish(fish: number): string {
  return fishFormatter.format(Math.floor(fish));
}

/** 남은 시간 → '3시간 20분', '45분', '1분 이내' */
export function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / MINUTE_MS);
  if (totalMinutes < 1) return '1분 이내';
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}
