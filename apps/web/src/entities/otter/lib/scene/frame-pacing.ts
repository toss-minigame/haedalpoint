/**
 * 장면을 그리는 빠르기 (초당 횟수). 방치형 화면이라 켜 두는 시간이 길어, 배터리와 발열을 줄이려고
 * 화면 주사율을 그대로 따르지 않고 이 횟수까지만 그린다. 60Hz 화면은 매 프레임, 120Hz 화면은 2프레임마다 그린다.
 * 30으로 내리면 그리는 횟수가 절반이 되지만 해달·눈사람 움직임이 덜 부드럽다.
 */
export const SCENE_FPS = 60;

const FRAME_INTERVAL_MS = 1000 / SCENE_FPS;
/**
 * 브라우저가 프레임을 알려 주는 시각은 몇 ms 씩 흔들린다. 간격을 꽉 채워 기다리면 한 프레임 간격이
 * 살짝 모자랄 때 한 프레임을 더 건너뛰어 그리는 횟수가 뚝 떨어지므로 (60Hz 화면에서 초당 30번), 그만큼 여유를 둔다
 */
const JITTER_MS = 4;

/**
 * 지금 프레임에 장면을 그릴 차례인지. 처음이거나 마지막으로 그린 뒤 한 프레임 간격이 지났으면 그린다.
 * everyFrame 이면 간격을 보지 않고 매 프레임 그린다 (해달을 끌어 돌리는 동안은 손을 바로 따라가게).
 */
export function isFrameDue(lastDrawnAt: number | null, now: number, everyFrame: boolean): boolean {
  if (everyFrame || lastDrawnAt === null) return true;
  return now - lastDrawnAt >= FRAME_INTERVAL_MS - JITTER_MS;
}
