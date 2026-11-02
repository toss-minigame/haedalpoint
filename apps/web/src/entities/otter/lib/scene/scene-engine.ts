import { drawScene, type SceneSprites } from './scene-render';
import {
  createSceneState,
  requestCatch,
  resizeScene,
  SCENE,
  type SceneState,
  stepScene,
} from './scene-state';

const MAX_FRAME_DT = 0.05; // 탭 전환 등으로 프레임이 길게 끊겨도 한 번에 크게 점프하지 않게
const MS_PER_SECOND = 1000;

export type SceneEngineOptions = {
  sprites: { idle: string; happy: string };
  /** '동작 줄이기' 설정 사용자: 애니메이션 없이 정지 장면만 그리고, 탭하면 표정만 바뀐다 */
  reducedMotion: boolean;
};

export type SceneEngine = {
  catchFish: () => void;
  destroy: () => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`이미지를 불러오지 못했어요: ${src}`));
    image.src = src;
  });
}

/**
 * 캔버스에 해달 낚시 장면을 그리고 애니메이션을 돌린다.
 * - 부모 크기를 따라가며 devicePixelRatio 만큼 선명하게 그린다
 * - 화면이 보이지 않으면(탭 전환·앱 백그라운드) 멈춘다
 * - destroy() 로 루프·옵저버·리스너를 모두 정리한다
 */
export function createSceneEngine(
  canvas: HTMLCanvasElement,
  options: SceneEngineOptions,
): SceneEngine {
  const context = canvas.getContext('2d');
  if (!context) return { catchFish: () => {}, destroy: () => {} };
  const ctx = context;

  const random = Math.random;
  let state: SceneState = createSceneState(canvas.clientWidth, canvas.clientHeight, random);
  let sprites: SceneSprites | null = null;
  let frameId: number | null = null;
  let lastTimestamp: number | null = null;
  let happyTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const render = () => drawScene(ctx, state, sprites);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state = resizeScene(state, width, height, random);
    render();
  };

  const tick = (timestamp: number) => {
    const dt =
      lastTimestamp === null
        ? 0
        : Math.min((timestamp - lastTimestamp) / MS_PER_SECOND, MAX_FRAME_DT);
    lastTimestamp = timestamp;
    state = stepScene(state, dt, random, true);
    render();
    frameId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (options.reducedMotion || frameId !== null || destroyed) return;
    lastTimestamp = null;
    frameId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  };

  const handleVisibility = () => (document.hidden ? stop() : start());

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  document.addEventListener('visibilitychange', handleVisibility);

  Promise.all([loadImage(options.sprites.idle), loadImage(options.sprites.happy)])
    .then(([idle, happy]) => {
      sprites = { idle, happy };
      render();
    })
    // 이미지를 못 불러와도 바다·물고기는 그린다 (해달만 빠짐)
    .catch(() => {});

  resize();
  if (!document.hidden) start();

  const catchFish = () => {
    if (destroyed) return;
    if (!options.reducedMotion) {
      state = requestCatch(state, random);
      return;
    }
    // 동작 줄이기: 튀어 오르는 연출 없이 표정만 잠깐 바꾼다
    state = { ...state, happyUntil: Number.POSITIVE_INFINITY };
    render();
    if (happyTimer) clearTimeout(happyTimer);
    happyTimer = setTimeout(() => {
      state = { ...state, happyUntil: 0 };
      render();
    }, SCENE.HAPPY_DURATION * MS_PER_SECOND);
  };

  const destroy = () => {
    destroyed = true;
    stop();
    if (happyTimer) clearTimeout(happyTimer);
    resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  return { catchFish, destroy };
}
