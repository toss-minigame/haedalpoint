const FULL_TURN = 360;
/** 결과 칸에 멈추기 전에 더 도는 바퀴 수 */
const EXTRA_TURNS = 5;

/** index 번째 칸이 위쪽 바늘 아래에 오는 원판 각도 (0 이상 360 미만) */
export function landingAngle(index: number, count: number): number {
  return (FULL_TURN - (index * FULL_TURN) / count) % FULL_TURN;
}

/** 지금 각도에서 시계 방향으로 몇 바퀴 더 돈 뒤 index 번째 칸에 멈추는 누적 각도 */
export function nextSpinRotation(current: number, index: number, count: number): number {
  const currentAngle = ((current % FULL_TURN) + FULL_TURN) % FULL_TURN;
  const delta = (landingAngle(index, count) - currentAngle + FULL_TURN) % FULL_TURN;
  return current + EXTRA_TURNS * FULL_TURN + delta;
}
