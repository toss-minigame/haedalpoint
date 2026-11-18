import { isFrameDue } from './frame-pacing';
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
/**
 * 캔버스를 그리는 최대 배율. 3배 화면(최신 아이폰 등)에서 그대로 그리면 픽셀 수가 2배보다 2.25배 많아
 * 매 프레임 배경을 다시 칠하는 비용이 그만큼 든다. 3D 해달도 같은 배율까지만 그린다 (otter-model.ts)
 */
const MAX_PIXEL_RATIO = 2;
/**
 * 3D 해달을 못 불러왔을 때 다시 시도하기까지 기다리는 시간 (ms). 다 써도 못 불러오면 해달 없이 두고,
 * 화면으로 돌아올 때 다시 시도한다
 */
const MODEL_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];
/** WebGL 컨텍스트를 잃은 뒤 3D 해달을 새로 만들기까지 기다리는 시간 (ms). 잃자마자 만들면 또 잃기 쉽다 */
const CONTEXT_LOST_RELOAD_MS = 1000;
/**
 * 컨텍스트를 연달아 잃어 3D 해달을 새로 만드는 횟수의 한도. 넘으면 그만두고 화면으로 돌아올 때 다시 시도한다
 * (계속 잃는 기기에서 끝없이 새로 만들지 않게)
 */
const MAX_CONTEXT_RELOADS = 3;
/** 새로 만든 3D 해달이 이만큼(ms) 버텼으면 연달아 잃은 것으로 세지 않는다 (오래 켜 둔 화면에서 가끔 잃는 것은 계속 되살린다) */
const CONTEXT_STABLE_MS = 30_000;

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
    /** 3D 해달을 찍어 둔 정지 그림. 3D 를 불러오는 동안과 쓸 수 없을 때 대신 그린다 */
    otterStill: string;
    fish: Record<FishKind, string>;
    background: string;
    puddle: string;
  };
  /** '동작 줄이기' 설정 사용자: 애니메이션 없이 정지 장면만 그리고, 탭하면 잡은 모습만 잠깐 보인다 */
  reducedMotion: boolean;
  /**
   * 3D 해달 모델(glb) 주소. three.js 를 따로 불러와 해달을 3D 로 그린다
   * (불러오기 전이나 끝내 못 불러오면 해달 없이 둔다)
   */
  otterModelUrl: string;
  /** 해달 친구로 그릴 3D 눈사람 모델(glb) 주소 */
  friendModelUrl: string;
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
  /** 친구(눈사람)가 녹은 정도 (0 = 멀쩡, 1 = 다 녹음) */
  setFriendMelt: (melt: number) => void;
  /** 친구가 없을 때 보여 줄, 출석으로 만드는 중인 눈사람 단계 (0 = 없음 … 6 = 완성) */
  setFriendBuildStage: (stage: number) => void;
  /** 눈사람을 얼리는 연출을 한 번 보여 준다 (얼음 조각이 솟고 만세한다) */
  playFriendFreeze: () => void;
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
 * - 부모 크기를 따라가며 devicePixelRatio 만큼(최대 MAX_PIXEL_RATIO 배) 선명하게 그린다
 * - 초당 SCENE_FPS 번 그린다 (frame-pacing.ts)
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
      setFriendMelt: () => {},
      setFriendBuildStage: () => {},
      playFriendFreeze: () => {},
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
  let otterFriendVisible = false;
  let friendCatchLabel: string | null = null;
  let friendMelt = 0;
  let friendBuildStage = 0;
  let friendFrozenAt: number | null = null;
  // 3D 해달. 아직 못 불러왔으면 null 이고, 그동안은 해달·친구를 그리지 않는다
  let otterModel: OtterModelView | null = null;
  // 3D 해달을 불러오는 중이거나 다시 시도하려고 기다리는 중인지
  let modelLoading = false;
  let modelRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let contextReloads = 0;
  let modelLoadedAt = 0;
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
      {
        visible: otterFriendVisible,
        catchLabel: friendCatchLabel,
        melt: friendMelt,
        buildStage: friendBuildStage,
        frozenAt: friendFrozenAt,
      },
      otterModel,
    );

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state = resizeScene(state, width, height, random);
    render();
  };

  const tick = (timestamp: number) => {
    frameId = requestAnimationFrame(tick);
    // 초당 SCENE_FPS 번만 그린다. 해달을 끌어 돌리는 동안은 손을 바로 따라가게 매 프레임 그린다
    if (!isFrameDue(lastTimestamp, timestamp, drag?.moved ?? false)) return;
    const dt =
      lastTimestamp === null
        ? 0
        : Math.min((timestamp - lastTimestamp) / MS_PER_SECOND, MAX_FRAME_DT);
    lastTimestamp = timestamp;
    state = stepScene(state, dt, random, true);
    returnYaw(dt);
    render();
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

  const handleVisibility = () => {
    if (document.hidden) {
      stop();
      return;
    }
    start();
    // 뒤에 가 있는 동안 3D 해달을 잃었거나 끝내 못 불러왔으면 돌아왔을 때 다시 불러온다
    contextReloads = 0;
    reloadModel(0);
  };

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
    // 정지 그림은 못 불러와도 나머지 장면은 그린다 (해달만 빠진다)
    loadImage(options.sprites.otterStill).catch(() => null),
    loadFishImages(options.sprites.fish),
    loadImage(options.sprites.background),
    loadImage(options.sprites.puddle),
  ])
    .then(([otterStill, fish, background, puddle]) => {
      sprites = { otterStill, fish, background, puddle };
      render();
    })
    // 이미지를 못 불러와도 단색 하늘·눈밭과 웅덩이·이모지 물고기는 그린다
    .catch(() => {});

  // 3D 해달은 three.js 가 커서 따로 불러온다. 못 불러오면 몇 번 다시 시도하고, 그동안은 해달을 그리지 않는다
  const loadModel = (attempt: number) => {
    modelRetryTimer = null;
    if (destroyed) return;
    modelLoading = true;
    import('../otter-3d/otter-model')
      .then(({ createOtterModel }) =>
        createOtterModel(options.otterModelUrl, {
          reducedMotion: options.reducedMotion,
          friendUrl: options.friendModelUrl,
          preloadFriend: otterFriendVisible || friendBuildStage > 0,
          onUpdate: () => {
            if (!destroyed) render();
          },
          onContextLost: handleContextLost,
        }),
      )
      .then((model) => {
        modelLoading = false;
        if (destroyed) {
          model.dispose();
          return;
        }
        otterModel = model;
        modelLoadedAt = performance.now();
        model.setUserYaw(userYaw);
        render();
      })
      .catch(() => {
        const delay = MODEL_RETRY_DELAYS_MS[attempt];
        if (destroyed || delay === undefined) {
          modelLoading = false;
          return;
        }
        modelRetryTimer = setTimeout(() => loadModel(attempt + 1), delay);
      });
  };

  /** 3D 해달이 없고 불러오는 중도 아니면 delayMs 뒤에 다시 불러온다 */
  function reloadModel(delayMs: number) {
    if (destroyed || otterModel || modelLoading) return;
    modelLoading = true;
    modelRetryTimer = setTimeout(() => loadModel(0), delayMs);
  }

  /**
   * 3D 해달이 WebGL 컨텍스트를 잃었다. 그 모델은 더 그릴 수 없으니 치우고 새로 만든다
   * (그동안은 처음 불러올 때처럼 해달 없이 둔다). 화면이 뒤에 가 있으면 돌아올 때 만든다
   */
  function handleContextLost() {
    if (destroyed || !otterModel) return;
    otterModel.dispose();
    otterModel = null;
    drag = null;
    render();
    if (performance.now() - modelLoadedAt >= CONTEXT_STABLE_MS) contextReloads = 0;
    if (document.hidden || contextReloads >= MAX_CONTEXT_RELOADS) return;
    contextReloads += 1;
    reloadModel(CONTEXT_LOST_RELOAD_MS);
  }

  loadModel(0);

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
    if (modelRetryTimer) clearTimeout(modelRetryTimer);
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

  // 동작 줄이기 모드는 매 프레임 다시 그리지 않으므로, 눈사람 상태가 바뀌면 바로 그린다
  const setFriendMelt = (melt: number) => {
    friendMelt = melt;
    if (!destroyed && options.reducedMotion) render();
  };

  const setFriendBuildStage = (stage: number) => {
    friendBuildStage = stage;
    if (!destroyed && options.reducedMotion) render();
  };

  const playFriendFreeze = () => {
    // 동작 줄이기 모드는 장면 시각이 흐르지 않아 연출을 끝낼 수 없으므로 보여 주지 않는다
    if (destroyed || options.reducedMotion) return;
    friendFrozenAt = state.time;
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
    setFriendMelt,
    setFriendBuildStage,
    playFriendFreeze,
    consumeDrag,
    destroy,
  };
}
