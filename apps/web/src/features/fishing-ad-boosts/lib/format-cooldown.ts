const MINUTE_MS = 60 * 1000;

/** 남은 쿨타임을 'N분' 으로. 1분 미만은 '1분' 으로 올려 보여준다 */
export function formatCooldown(remainingMs: number): string {
  return `${Math.max(Math.ceil(remainingMs / MINUTE_MS), 1)}분`;
}
