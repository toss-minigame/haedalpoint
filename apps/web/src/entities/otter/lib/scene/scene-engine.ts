import { drawScene, type FishImages, type SceneSprites } from './scene-render';
import {
  createSceneState,
  FISH_KINDS,
  type FishKind,
  randomFishKind,
  requestCatch,
  resizeScene,
  SCENE,
  type SceneState,
  stepScene,
} from './scene-state';

const MAX_FRAME_DT = 0.05; // 탭 전환 등으로 프레임이 길게 끊겨도 한 번에 크게 점프하지 않게
const MS_PER_SECOND = 1000;

export type SceneEngineOptions = {
  sprites: {
    idle: string;
    happy: string;
    pier: string;
    fish: Record<FishKind, string>;
    background: string;
    wave: string;
  };
  /** '동작 줄이기' 설정 사용자: 애니메이션 없이 정지 장면만 그리고, 탭하면 표정만 바뀐다 */
  reducedMotion: boolean;
};

export type SceneEngine = {
  catchFish: () => void;
  /** 자동으로 잡을 때 물고기 옆에 띄울 글자 (예: +0.0000208). null 이면 띄우지 않는다 */
  setCatchLabel: (label: string | null) => void;
  destroy: () => void;
};

async function loadFishImages(sources: Record<FishKind, string>): Promise<FishImages> {
  const images = await Promise.all(FISH_KINDS.map((kind) => loadImage(sources[kind])));
  return Object.fromEntries(FISH_KINDS.map((kind, i) => [kind, images[i]])) as FishImages;
}

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
  if (!context) return { catchFish: () => {}, setCatchLabel: () => {}, destroy: () => {} };
  const ctx = context;

  const random = Math.random;
  let state: SceneState = createSceneState(canvas.clientWidth, canvas.clientHeight, random);
  let sprites: SceneSprites | null = null;
  let frameId: number | null = null;
  let lastTimestamp: number | null = null;
  let happyTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let catchLabel: string | null = null;

  const render = () => drawScene(ctx, state, sprites, catchLabel);

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

  Promise.all([
    loadImage(options.sprites.idle),
    loadImage(options.sprites.happy),
    loadImage(options.sprites.pier),
    loadFishImages(options.sprites.fish),
    loadImage(options.sprites.background),
    loadImage(options.sprites.wave),
  ])
    .then(([idle, happy, pier, fish, background, wave]) => {
      sprites = { idle, happy, pier, fish, background, wave };
      render();
    })
    // 이미지를 못 불러와도 단색 바다·이모지 물고기는 그린다 (선착장·해달·파도만 빠짐)
    .catch(() => {});

  resize();
  if (!document.hidden) start();

  const catchFish = () => {
    if (destroyed) return;
    if (!options.reducedMotion) {
      state = requestCatch(state, random);
      return;
    }
    // 동작 줄이기: 튀어 오르는 연출·페이드 없이 표정만 잠깐 바꾼다
    state = {
      ...state,
      happySince: Number.NEGATIVE_INFINITY,
      happyUntil: Number.POSITIVE_INFINITY,
      hooked: { kind: randomFishKind(random), size: SCENE.FISH_MAX_SIZE, labeled: false },
    };
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

  const setCatchLabel = (label: string | null) => {
    catchLabel = label;
  };

  return { catchFish, setCatchLabel, destroy };
}
