import { drawScene, type FishImages, type SceneSprites } from './scene-render';
import {
  createSceneState,
  endCatch,
  FISH_KINDS,
  type FishKind,
  HOLD_SECONDS,
  requestCatch,
  resizeScene,
  type SceneState,
  showCaught,
  stepScene,
} from './scene-state';

const MAX_FRAME_DT = 0.05; // 탭 전환 등으로 프레임이 길게 끊겨도 한 번에 크게 점프하지 않게
const MS_PER_SECOND = 1000;

export type SceneEngineOptions = {
  sprites: {
    /** 해달 프레임 (0 = 기다리는 모습, 마지막 = 잡은 모습) */
    otter: readonly string[];
    fish: Record<FishKind, string>;
    background: string;
    puddle: string;
    /** 해달 친구 프레임 (해달 프레임과 같은 순서) */
    friend: readonly string[];
  };
  /** '동작 줄이기' 설정 사용자: 애니메이션 없이 정지 장면만 그리고, 탭하면 잡은 모습만 잠깐 보인다 */
  reducedMotion: boolean;
};

export type SceneEngine = {
  catchFish: () => void;
  /** 자동으로 잡을 때 물고기 옆에 띄울 글자 (예: +3). null 이면 띄우지 않는다 */
  setCatchLabel: (label: string | null) => void;
  /** 해달 친구를 함께 그릴지 */
  setOtterFriendVisible: (visible: boolean) => void;
  /** 해달 친구가 물고기를 잡을 때 띄울 글자 (친구 몫). null 이면 띄우지 않는다 */
  setFriendCatchLabel: (label: string | null) => void;
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
  if (!context) {
    return {
      catchFish: () => {},
      setCatchLabel: () => {},
      setOtterFriendVisible: () => {},
      setFriendCatchLabel: () => {},
      destroy: () => {},
    };
  }
  const ctx = context;

  const random = Math.random;
  let state: SceneState = createSceneState(canvas.clientWidth, canvas.clientHeight);
  let sprites: SceneSprites | null = null;
  let frameId: number | null = null;
  let lastTimestamp: number | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let catchLabel: string | null = null;
  let friendFrames: readonly HTMLImageElement[] | null = null;
  let otterFriendVisible = false;
  let friendCatchLabel: string | null = null;

  const render = () =>
    drawScene(ctx, state, sprites, catchLabel, {
      visible: otterFriendVisible,
      frames: friendFrames,
      catchLabel: friendCatchLabel,
    });

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state = resizeScene(state, width, height);
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
    Promise.all(options.sprites.otter.map(loadImage)),
    loadFishImages(options.sprites.fish),
    loadImage(options.sprites.background),
    loadImage(options.sprites.puddle),
  ])
    .then(([otter, fish, background, puddle]) => {
      sprites = { otter, fish, background, puddle };
      render();
    })
    // 이미지를 못 불러와도 단색 하늘·눈밭과 웅덩이·이모지 물고기는 그린다 (해달만 빠짐)
    .catch(() => {});

  // 해달 친구 그림은 따로 불러와, 못 불러와도 장면의 나머지는 그대로 그린다
  Promise.all(options.sprites.friend.map(loadImage))
    .then((frames) => {
      friendFrames = frames;
      render();
    })
    .catch(() => {});

  resize();
  if (!document.hidden) start();

  const catchFish = () => {
    if (destroyed) return;
    if (!options.reducedMotion) {
      state = requestCatch(state, random);
      return;
    }
    // 동작 줄이기: 입질·챔질 없이 물고기가 줄 끝에 매달린 모습만 잠깐 보인다
    state = showCaught(state, random);
    render();
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      state = endCatch(state);
      render();
    }, HOLD_SECONDS * MS_PER_SECOND);
  };

  const destroy = () => {
    destroyed = true;
    stop();
    if (holdTimer) clearTimeout(holdTimer);
    resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const setCatchLabel = (label: string | null) => {
    catchLabel = label;
  };

  const setOtterFriendVisible = (visible: boolean) => {
    otterFriendVisible = visible;
    // 동작 줄이기 모드는 매 프레임 다시 그리지 않으므로 바로 그린다
    if (!destroyed) render();
  };

  const setFriendCatchLabel = (label: string | null) => {
    friendCatchLabel = label;
  };

  return { catchFish, setCatchLabel, setOtterFriendVisible, setFriendCatchLabel, destroy };
}
