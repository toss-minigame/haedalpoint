const MINUTE_MS = 60 * 1000;
const HOUR_MINUTES = 60;

/** 남은 쿨타임을 'N분' 또는 'N시간 M분' 으로. 1분 미만은 '1분' 으로 올려 보여준다 */
export function formatCooldown(remainingMs: number): string {
  const minutes = Math.max(Math.ceil(remainingMs / MINUTE_MS), 1);
  if (minutes < HOUR_MINUTES) return `${minutes}분`;
  const hours = Math.floor(minutes / HOUR_MINUTES);
  const rest = minutes % HOUR_MINUTES;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
