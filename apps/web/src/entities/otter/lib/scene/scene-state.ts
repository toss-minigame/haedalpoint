// 해달 낚시 장면의 상태와 상태 전이. DOM·캔버스에 의존하지 않는 순수 함수만 둔다.
// 매 프레임 새 상태 객체를 돌려준다 (물고기 수가 적어 비용이 작다).

export type Random = () => number;

export const FISH_KINDS = ['angelfish', 'goldfish', 'pufferfish', 'bluefish'] as const;
export type FishKind = (typeof FISH_KINDS)[number];

export type Fish = {
  id: number;
  kind: FishKind;
  x: number;
  y: number;
  speed: number; // px/s
  dir: 1 | -1; // 1 = 오른쪽으로 헤엄
  size: number; // px
};

export type JumpingFish = {
  kind: FishKind;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  elapsed: number;
  /** 자동으로 잡은 물고기면 true. 바늘에 걸리면 옆에 잡은 양을 띄운다 (탭으로 잡은 물고기는 띄우지 않음) */
  labeled: boolean;
};

export type Splash = {
  x: number;
  y: number;
  elapsed: number;
};

export type SceneState = {
  width: number;
  height: number;
  time: number;
  fish: readonly Fish[];
  jumping: JumpingFish | null;
  splashes: readonly Splash[];
  happySince: number; // 기쁜 표정이 시작된 시각(time). 표정 전환 페이드에 쓴다
  happyUntil: number; // 이 시각(time)까지 해달이 기쁜 표정
  hooked: { kind: FishKind; size: number; labeled: boolean } | null; // 바늘에 걸린 물고기 (기쁜 표정일 때만 보인다)
  nextAutoCatchAt: number;
  nextFishId: number;
};

export const SCENE = {
  WATER_LINE_RATIO: 0.62,
  FISH_COUNT: 4,
  FISH_MIN_SIZE: 22,
  FISH_MAX_SIZE: 32,
  FISH_MIN_SPEED: 18,
  FISH_MAX_SPEED: 42,
  // 3초마다 한 마리 잡는다. 튀어 오르기 + 기쁜 표정(2.3초)이 이 간격 안에 끝나야 연출이 겹치지 않는다
  AUTO_CATCH_INTERVAL: 3, // s
  JUMP_DURATION: 0.7, // s
  JUMP_ARC_HEIGHT: 70, // px
  HAPPY_DURATION: 1.6, // s
  HAPPY_FADE: 0.15, // s, 대기 ↔ 기쁜 스프라이트 전환 페이드
  SPLASH_DURATION: 0.6, // s
  // 배경 (shared/assets/scene/sea-background.jpg 기준). 이미지 안 수평선 높이
  BACKGROUND_HORIZON_RATIO: 0.637,
  // 파도 띠 (shared/assets/scene/sea-wave.png 기준). 마루 4개가 한 타일
  WAVE_TILE_WIDTH: 320, // px
  WAVE_SURFACE_Y_RATIO: 0.335, // 타일 안 파도 골(수면) 높이
  WAVE_SCROLL_SPEED: 12, // px/s
  // 선착장 (shared/assets/scene/pier.png 기준). 왼쪽 끝을 화면 왼쪽에 붙여 그린다
  PIER_ASPECT: 600 / 455, // 이미지 가로 / 세로
  PIER_HEIGHT_RATIO: 0.49, // 장면 높이 대비 선착장 이미지 높이
  PIER_DECK_Y_RATIO: 0.353, // 이미지 안 상판 가운데 높이 (의자가 놓이는 곳)
  PIER_WATER_Y_RATIO: 0.614, // 이미지 안에서 수면이 닿는 높이 (기둥 중간)
  // 해달 스프라이트 (otter-fishing-*.png 기준)
  OTTER_PIER_RATIO: 0.715, // 선착장 너비 대비 해달 이미지 크기
  OTTER_PIER_END_OFFSET: 0.659, // 선착장 끝에서 해달 이미지 왼쪽까지 (해달 크기 대비)
  OTTER_FOOT_RATIO: 0.98, // 이미지 안 의자 다리·발 아래 끝 높이
  // 성공 스프라이트 안 낚싯바늘 끝 위치 (이미지 크기 대비 비율). 잡힌 물고기가 여기에 매달린다
  HOOK_X_RATIO: 0.933,
  HOOK_Y_RATIO: 0.453,
  HOOKED_FISH_DROP: 0.4, // 바늘 끝에서 매달린 물고기 중심까지 (물고기 크기 대비)
  HOOKED_FISH_SWING: 0.12, // rad, 매달린 물고기가 좌우로 흔들리는 각도
  HOOKED_FISH_SWING_SPEED: 3, // rad/s
} as const;

/** 해달이 스스로 물고기를 잡는 간격 (초). 잡을 때 띄우는 양을 계산할 때 쓴다 */
export const CATCH_INTERVAL_SECONDS = SCENE.AUTO_CATCH_INTERVAL;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

export function randomFishKind(random: Random): FishKind {
  return FISH_KINDS[Math.floor(random() * FISH_KINDS.length)] ?? FISH_KINDS[0];
}

export function waterLineY(height: number): number {
  return height * SCENE.WATER_LINE_RATIO;
}

export type Rect = { x: number; y: number; width: number; height: number };

/** 선착장 그리기 영역. 장면 높이에 맞춰 크기를 정하고, 기둥 중간이 수면에 오게 둔다 */
export function pierLayout({ height }: Pick<SceneState, 'height'>): Rect {
  const pierHeight = height * SCENE.PIER_HEIGHT_RATIO;
  return {
    x: 0,
    y: waterLineY(height) - pierHeight * SCENE.PIER_WATER_Y_RATIO,
    width: pierHeight * SCENE.PIER_ASPECT,
    height: pierHeight,
  };
}

/** 선착장 끝 상판 위에 앉은 해달의 그리기 위치(왼쪽 위)·크기와 낚싯바늘 위치 */
export function otterLayout(state: Pick<SceneState, 'height'>) {
  const pier = pierLayout(state);
  const deckY = pier.y + pier.height * SCENE.PIER_DECK_Y_RATIO;
  const size = pier.width * SCENE.OTTER_PIER_RATIO;
  const x = pier.x + pier.width - size * SCENE.OTTER_PIER_END_OFFSET;
  const y = deckY - size * SCENE.OTTER_FOOT_RATIO;
  return {
    x,
    y,
    size,
    hookX: x + size * SCENE.HOOK_X_RATIO,
    hookY: y + size * SCENE.HOOK_Y_RATIO,
  };
}

function spawnFish(
  id: number,
  width: number,
  height: number,
  random: Random,
  atEdge: boolean,
): Fish {
  const dir = random() < 0.5 ? 1 : -1;
  const size = between(random, SCENE.FISH_MIN_SIZE, SCENE.FISH_MAX_SIZE);
  const top = waterLineY(height) + size;
  const x = atEdge ? (dir === 1 ? -size : width + size) : between(random, size, width - size);
  return {
    id,
    kind: randomFishKind(random),
    x,
    y: between(random, top, height - size / 2),
    speed: between(random, SCENE.FISH_MIN_SPEED, SCENE.FISH_MAX_SPEED),
    dir,
    size,
  };
}

export function createSceneState(width: number, height: number, random: Random): SceneState {
  const fish = Array.from({ length: SCENE.FISH_COUNT }, (_, i) =>
    spawnFish(i, width, height, random, false),
  );
  return {
    width,
    height,
    time: 0,
    fish,
    jumping: null,
    splashes: [],
    happySince: 0,
    happyUntil: 0,
    hooked: null,
    nextAutoCatchAt: SCENE.AUTO_CATCH_INTERVAL,
    nextFishId: fish.length,
  };
}

/** 크기가 바뀌면 물고기를 새 영역 안에서 다시 배치한다 */
export function resizeScene(
  state: SceneState,
  width: number,
  height: number,
  random: Random,
): SceneState {
  return {
    ...createSceneState(width, height, random),
    time: state.time,
    nextAutoCatchAt: state.nextAutoCatchAt,
  };
}

function swim(fish: Fish, dt: number, width: number): Fish {
  const x = fish.x + fish.speed * fish.dir * dt;
  const hitRight = fish.dir === 1 && x > width - fish.size / 2;
  const hitLeft = fish.dir === -1 && x < fish.size / 2;
  return hitRight || hitLeft ? { ...fish, dir: (fish.dir * -1) as 1 | -1 } : { ...fish, x };
}

/** 낚싯바늘과 가장 가까운 물고기를 바늘로 튀어 오르게 하고, 그 자리는 새 물고기로 채운다 */
export function requestCatch(state: SceneState, random: Random, labeled = false): SceneState {
  if (state.jumping || state.fish.length === 0) return state;

  const { hookX } = otterLayout(state);
  const target = state.fish.reduce((nearest, fish) =>
    Math.abs(fish.x - hookX) < Math.abs(nearest.x - hookX) ? fish : nearest,
  );
  const landing = hookedFishCenter(state, target.size);
  const replacement = spawnFish(state.nextFishId, state.width, state.height, random, true);

  return {
    ...state,
    fish: state.fish.map((fish) => (fish.id === target.id ? replacement : fish)),
    nextFishId: state.nextFishId + 1,
    jumping: {
      kind: target.kind,
      fromX: target.x,
      fromY: target.y,
      toX: landing.x,
      toY: landing.y,
      size: target.size,
      elapsed: 0,
      labeled,
    },
    splashes: [...state.splashes, { x: target.x, y: waterLineY(state.height), elapsed: 0 }],
    nextAutoCatchAt: state.time + SCENE.AUTO_CATCH_INTERVAL,
  };
}

/** 한 프레임 진행. autoCatch 가 true 면 일정 주기로 스스로 물고기를 잡는다 */
export function stepScene(
  state: SceneState,
  dt: number,
  random: Random,
  autoCatch: boolean,
): SceneState {
  const time = state.time + dt;
  const advanced: SceneState = {
    ...state,
    time,
    fish: state.fish.map((fish) => swim(fish, dt, state.width)),
    splashes: state.splashes
      .map((splash) => ({ ...splash, elapsed: splash.elapsed + dt }))
      .filter((splash) => splash.elapsed < SCENE.SPLASH_DURATION),
  };

  if (advanced.jumping) {
    const jumping = { ...advanced.jumping, elapsed: advanced.jumping.elapsed + dt };
    const landed = jumping.elapsed >= SCENE.JUMP_DURATION;
    return landed
      ? {
          ...advanced,
          jumping: null,
          happySince: time,
          happyUntil: time + SCENE.HAPPY_DURATION,
          hooked: { kind: jumping.kind, size: jumping.size, labeled: jumping.labeled },
        }
      : { ...advanced, jumping };
  }

  return autoCatch && time >= advanced.nextAutoCatchAt
    ? requestCatch(advanced, random, true)
    : advanced;
}

/**
 * 기쁜 스프라이트를 얼마나 보여줄지 (0 = 대기, 1 = 기쁨).
 * 시작·끝에서 HAPPY_FADE 동안 서서히 바뀐다.
 */
export function happyBlend({ time, happySince, happyUntil }: SceneState): number {
  if (time >= happyUntil) return 0;
  const fadeIn = (time - happySince) / SCENE.HAPPY_FADE;
  const fadeOut = (happyUntil - time) / SCENE.HAPPY_FADE;
  return Math.min(Math.max(Math.min(fadeIn, fadeOut), 0), 1);
}

/** 바늘에 매달린 물고기의 중심 (흔들리기 전). 튀어 오른 물고기는 여기에 내려앉는다 */
export function hookedFishCenter(state: Pick<SceneState, 'height'>, size: number) {
  const { hookX, hookY } = otterLayout(state);
  return { x: hookX, y: hookY + size * SCENE.HOOKED_FISH_DROP };
}

/** 매달린 물고기가 바늘을 축으로 흔들리는 각도. 걸린 순간 0 에서 시작한다 */
export function hookedFishSwing({ time, happySince }: SceneState): number {
  const elapsed = time - happySince;
  // 동작 줄이기 모드는 happySince 가 -Infinity 라 흔들지 않는다
  if (!Number.isFinite(elapsed)) return 0;
  return Math.sin(elapsed * SCENE.HOOKED_FISH_SWING_SPEED) * SCENE.HOOKED_FISH_SWING;
}

/** 매달린 물고기의 불투명도. 튀어 오른 물고기를 그대로 이어받으므로 끝날 때만 서서히 사라진다 */
export function hookedFishOpacity({ time, happyUntil }: SceneState): number {
  return Math.min(Math.max((happyUntil - time) / SCENE.HAPPY_FADE, 0), 1);
}

/** 튀어 오르는 물고기의 현재 위치 (포물선) */
export function jumpPosition(jumping: JumpingFish) {
  const t = Math.min(jumping.elapsed / SCENE.JUMP_DURATION, 1);
  const x = jumping.fromX + (jumping.toX - jumping.fromX) * t;
  const y =
    jumping.fromY +
    (jumping.toY - jumping.fromY) * t -
    Math.sin(Math.PI * t) * SCENE.JUMP_ARC_HEIGHT;
  return { x, y, t };
}
