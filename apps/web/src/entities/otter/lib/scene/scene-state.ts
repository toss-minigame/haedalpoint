// 해달 낚시 장면의 상태와 상태 전이. DOM·캔버스에 의존하지 않는 순수 함수만 둔다.
// 매 프레임 새 상태 객체를 돌려준다 (물고기 수가 적어 비용이 작다).

export type Random = () => number;

export type Fish = {
  id: number;
  x: number;
  y: number;
  speed: number; // px/s
  dir: 1 | -1; // 1 = 오른쪽으로 헤엄
  size: number; // px
};

export type JumpingFish = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  size: number;
  elapsed: number;
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
  happyUntil: number; // 이 시각(time)까지 해달이 기쁜 표정
  nextAutoCatchAt: number;
  nextFishId: number;
};

export const SCENE = {
  WATER_LINE_RATIO: 0.52,
  FISH_COUNT: 4,
  FISH_MIN_SIZE: 22,
  FISH_MAX_SIZE: 32,
  FISH_MIN_SPEED: 18,
  FISH_MAX_SPEED: 42,
  AUTO_CATCH_INTERVAL: 4.5, // s
  JUMP_DURATION: 0.7, // s
  JUMP_ARC_HEIGHT: 70, // px
  HAPPY_DURATION: 1.6, // s
  SPLASH_DURATION: 0.6, // s
  OTTER_MAX_SIZE: 190, // px
  OTTER_HEIGHT_RATIO: 0.62,
  OTTER_SUBMERGE_RATIO: 0.2, // 해달 이미지 아래쪽이 물에 잠기는 비율
  OTTER_BOB_AMPLITUDE: 4, // px
  OTTER_BOB_SPEED: 2, // rad/s
} as const;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

export function waterLineY(height: number): number {
  return height * SCENE.WATER_LINE_RATIO;
}

/** 해달의 그리기 위치(왼쪽 위)와 크기, 물고기를 받는 손 위치 */
export function otterLayout({
  width,
  height,
  time,
}: Pick<SceneState, 'width' | 'height' | 'time'>) {
  const size = Math.min(height * SCENE.OTTER_HEIGHT_RATIO, SCENE.OTTER_MAX_SIZE);
  const bob = Math.sin(time * SCENE.OTTER_BOB_SPEED) * SCENE.OTTER_BOB_AMPLITUDE;
  const x = width / 2 - size / 2;
  const y = waterLineY(height) + size * SCENE.OTTER_SUBMERGE_RATIO - size + bob;
  return { x, y, size, handsX: width / 2, handsY: y + size * 0.22 };
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
    happyUntil: 0,
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

/** 해달과 가장 가까운 물고기를 해달 손으로 튀어 오르게 하고, 그 자리는 새 물고기로 채운다 */
export function requestCatch(state: SceneState, random: Random): SceneState {
  if (state.jumping || state.fish.length === 0) return state;

  const { handsX, handsY } = otterLayout(state);
  const target = state.fish.reduce((nearest, fish) =>
    Math.abs(fish.x - handsX) < Math.abs(nearest.x - handsX) ? fish : nearest,
  );
  const replacement = spawnFish(state.nextFishId, state.width, state.height, random, true);

  return {
    ...state,
    fish: state.fish.map((fish) => (fish.id === target.id ? replacement : fish)),
    nextFishId: state.nextFishId + 1,
    jumping: {
      fromX: target.x,
      fromY: target.y,
      toX: handsX,
      toY: handsY,
      size: target.size,
      elapsed: 0,
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
      ? { ...advanced, jumping: null, happyUntil: time + SCENE.HAPPY_DURATION }
      : { ...advanced, jumping };
  }

  return autoCatch && time >= advanced.nextAutoCatchAt ? requestCatch(advanced, random) : advanced;
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
