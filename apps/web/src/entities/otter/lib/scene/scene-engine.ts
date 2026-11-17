import { drawScene, type FishImages, type OtterModelView, type SceneSprites } from './scene-render';
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
  setHammockFull as withHammockFull,
} from './scene-state';

const MAX_FRAME_DT = 0.05; // 탭 전환 등으로 프레임이 길게 끊겨도 한 번에 크게 점프하지 않게
const MS_PER_SECOND = 1000;

/** 3D 해달을 가로로 끌어 돌리기 */
const DRAG = {
  THRESHOLD: 6, // px, 이만큼 움직여야 끌기로 본다 (그보다 작으면 탭)
  YAW_PER_PX: (2 * Math.PI) / 320, // 320px 끌면 한 바퀴
  RETURN_SPEED: 6, // 1/s, 손을 떼면 원래 방향으로 돌아오는 빠르기
  SETTLED: 0.002, // rad, 이보다 작으면 원래 방향에 닿은 것으로 본다
} as const;

/** 각도를 -π ~ π 로 맞춘다 (여러 바퀴 돌린 뒤 되감기지 않고 가까운 쪽으로 돌아오게) */
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

type Drag = { pointerId: number; startX: number; startYaw: number; moved: boolean };

export type SceneEngineOptions = {
  sprites: {
    /** 해달 프레임 (0 = 기다리는 모습, 마지막 = 잡은 모습) */
    otter: readonly string[];
    /** 해먹이 가득 찼을 때 해달 */
    full: string;
    fish: Record<FishKind, string>;
    background: string;
    puddle: string;
    /** 해달 친구 프레임 (해달 프레임과 같은 순서) */
    friend: readonly string[];
  };
  /** '동작 줄이기' 설정 사용자: 애니메이션 없이 정지 장면만 그리고, 탭하면 잡은 모습만 잠깐 보인다 */
  reducedMotion: boolean;
  /**
   * 3D 해달 모델(glb) 주소 (시험판). 주면 three.js 를 따로 불러와 해달을 3D 로 그린다.
   * 불러오기 전이나 WebGL 을 못 쓰면 지금처럼 그림으로 그린다
   */
  otterModelUrl?: string | null;
};

export type SceneEngine = {
  catchFish: () => void;
  /** 자동으로 잡을 때 물고기 옆에 띄울 글자 (예: +3). null 이면 띄우지 않는다 */
  setCatchLabel: (label: string | null) => void;
  /** 해달 친구를 함께 그릴지 */
  setOtterFriendVisible: (visible: boolean) => void;
  /** 해먹이 가득 찼는지. 가득 차면 더 잡지 않고 양동이를 든 모습으로 바뀐다 */
  setHammockFull: (full: boolean) => void;
  /** 해달 친구가 물고기를 잡을 때 띄울 글자 (친구 몫). null 이면 띄우지 않는다 */
  setFriendCatchLabel: (label: string | null) => void;
  /**
   * 방금 누른 동작이 3D 해달을 끌어 돌린 것이면 true (한 번 읽으면 지운다).
   * 끌기를 마친 뒤 이어지는 click 을 탭(물고기 잡기)으로 처리하지 않을 때 쓴다
   */
  consumeDrag: () => boolean;
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
      setHammockFull: () => {},
      setFriendCatchLabel: () => {},
      consumeDrag: () => false,
      destroy: () => {},
    };
  }
  const ctx = context;

  const random = Math.random;
  let state: SceneState = createSceneState(
    canvas.clientWidth,
    canvas.clientHeight,
    random,
    !options.reducedMotion,
  );
  let sprites: SceneSprites | null = null;
  let frameId: number | null = null;
  let lastTimestamp: number | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let catchLabel: string | null = null;
  let friendFrames: readonly HTMLImageElement[] | null = null;
  let otterFriendVisible = false;
  let friendCatchLabel: string | null = null;
  let otterModel: OtterModelView | null = null;
  let drag: Drag | null = null;
  let userYaw = 0;
  let dragged = false;

  const setUserYaw = (yaw: number) => {
    userYaw = yaw;
    otterModel?.setUserYaw(yaw);
  };

  /** 손을 뗀 뒤 원래 방향으로 천천히 돌아온다 */
  const returnYaw = (dt: number) => {
    if (drag || userYaw === 0) return;
    const next = userYaw * Math.exp(-DRAG.RETURN_SPEED * dt);
    setUserYaw(Math.abs(next) < DRAG.SETTLED ? 0 : next);
  };

  const render = () =>
    drawScene(
      ctx,
      state,
      sprites,
      catchLabel,
      { visible: otterFriendVisible, frames: friendFrames, catchLabel: friendCatchLabel },
      otterModel,
    );

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
    returnYaw(dt);
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

  // 3D 해달을 가로로 끌면 돌아간다 (터치·마우스 모두 pointer 이벤트). 세로로 끌면 화면이 그대로 스크롤된다
  const handlePointerDown = (event: PointerEvent) => {
    dragged = false;
    if (!otterModel || !event.isPrimary) return;
    drag = { pointerId: event.pointerId, startX: event.clientX, startYaw: userYaw, moved: false };
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG.THRESHOLD) return;
      drag = { ...drag, moved: true };
      // 손가락·마우스가 장면 밖으로 나가도 계속 돌릴 수 있게 잡아 둔다
      canvas.setPointerCapture(event.pointerId);
    }
    setUserYaw(drag.startYaw + dx * DRAG.YAW_PER_PX);
    // 동작 줄이기 모드는 매 프레임 다시 그리지 않으므로 바로 그린다
    if (options.reducedMotion) render();
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragged = drag.moved && event.type === 'pointerup';
    drag = null;
    // 동작 줄이기 모드는 천천히 돌아오는 연출 없이 바로 원래 방향으로 둔다
    setUserYaw(options.reducedMotion ? 0 : wrapAngle(userYaw));
    if (options.reducedMotion) render();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  document.addEventListener('visibilitychange', handleVisibility);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);

  Promise.all([
    Promise.all(options.sprites.otter.map(loadImage)),
    loadImage(options.sprites.full),
    loadFishImages(options.sprites.fish),
    loadImage(options.sprites.background),
    loadImage(options.sprites.puddle),
  ])
    .then(([otter, full, fish, background, puddle]) => {
      sprites = { otter, full, fish, background, puddle };
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

  // 3D 해달은 three.js 가 커서 필요할 때만 따로 불러온다. 실패하면 그림 해달을 그대로 쓴다
  const modelUrl = options.otterModelUrl;
  if (modelUrl) {
    import('../otter-3d/otter-model')
      .then(({ createOtterModel }) => createOtterModel(modelUrl))
      .then((model) => {
        if (destroyed) {
          model.dispose();
          return;
        }
        otterModel = model;
        model.setUserYaw(userYaw);
        render();
      })
      .catch(() => {});
  }

  resize();
  if (!document.hidden) start();

  const catchFish = () => {
    // 해먹이 가득 차면 눌러도 잡지 않는다
    if (destroyed || state.hammockFull) return;
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
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerup', handlePointerEnd);
    canvas.removeEventListener('pointercancel', handlePointerEnd);
    otterModel?.dispose();
    otterModel = null;
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

  const setHammockFull = (full: boolean) => {
    state = withHammockFull(state, full);
    // 동작 줄이기 모드는 매 프레임 다시 그리지 않으므로 바로 그린다
    if (!destroyed) render();
  };

  const consumeDrag = () => {
    const wasDrag = dragged;
    dragged = false;
    return wasDrag;
  };

  return {
    catchFish,
    setCatchLabel,
    setOtterFriendVisible,
    setHammockFull,
    setFriendCatchLabel,
    consumeDrag,
    destroy,
  };
}
