// 해달 얼음낚시 장면의 상태와 상태 전이. DOM·캔버스에 의존하지 않는 순수 함수만 둔다.
//
// 설원 위에 해달이 앉아 낚싯대를 물웅덩이에 드리우고 있다. 낚싯줄은 늘 낚싯대 끝과 이어져 있고,
// 물고기는 줄 끝(바늘)에만 매달려 움직인다 (물고기가 스스로 움직이는 장면은 없다).
//   대기   줄이 낚싯대 끝에서 웅덩이 수면으로 드리워져 있다
//   입질   줄 끝이 툭툭 당겨지고 웅덩이에 작은 물결이 인다 (해달이 알아챈다)
//   챔질   해달이 낚싯대를 들어 올리면 바늘이 웅덩이에서 낚싯대 끝 아래로 끌려 올라오고, 물고기가 따라 올라온다
//   잡음   물고기가 줄 끝에 매달려 흔들린다 (잡은 양을 띄운다)
//   던짐   물고기가 사라지고 낚싯대를 내리면 바늘이 다시 웅덩이로 들어간다
// 단계는 잡기 시작한 시각(catch.startedAt)부터 지난 시간으로만 정해진다.
//
// 낚싯대는 해달 그림(otter-fishing-*.png)에 함께 그려져 있고, 줄은 프레임마다 그림 속 낚싯대 끝(tip)에서 시작한다.
// 해달 친구가 오면 웅덩이 왼쪽에 앉는다 (낚싯대 없이 같은 동작만 한다).
// 해먹이 가득 차면 더 잡지 않고, 하던 동작을 마친 뒤 물고기가 가득한 양동이를 든 모습(otter-hammock-full.png)으로 바뀐다.

import { createSnowfall, type Snowfall, stepSnowfall } from './snow/snowfall';

export type Random = () => number;

export const FISH_KINDS = ['bluefish', 'goldfish'] as const;
export type FishKind = (typeof FISH_KINDS)[number];

/** 지금 잡고 있는 물고기 한 마리 */
export type Catch = {
  kind: FishKind;
  size: number;
  /** 잡기 시작한(입질이 온) 장면 시각 */
  startedAt: number;
  /** 자동으로 잡은 물고기면 true. 잡으면 옆에 잡은 양을 띄운다 (탭으로 잡은 물고기는 띄우지 않음) */
  labeled: boolean;
};

export type SceneState = {
  width: number;
  height: number;
  time: number;
  /** 잡는 중인 물고기. 대기 중이면 null */
  catch: Catch | null;
  nextAutoCatchAt: number;
  /** 해먹이 가득 찼으면 true. 더 잡지 않는다 */
  hammockFull: boolean;
  /** 장면에 내리는 눈. 눈을 그리지 않으면(동작 줄이기 모드) null */
  snowfall: Snowfall | null;
};

export const SCENE = {
  FISH_MIN_SIZE: 22,
  FISH_MAX_SIZE: 32,
  // 3초마다 한 마리 잡는다. 입질부터 물결이 잦아들 때까지(2.95초)가 이 간격 안에 끝나야 연출이 겹치지 않는다
  AUTO_CATCH_INTERVAL: 3, // s
  BITE_DURATION: 0.5, // s, 입질
  REEL_DURATION: 0.6, // s, 챔질 (바늘이 웅덩이에서 낚싯대 끝 아래까지 올라온다)
  HOLD_DURATION: 1.2, // s, 잡음 (물고기가 줄 끝에 매달려 있다)
  CAST_DURATION: 0.4, // s, 던짐 (낚싯대를 내리고 바늘이 웅덩이로 돌아간다)
  FADE: 0.15, // s, 매달린 물고기·잡은 양 글자가 나타나고 사라지는 페이드
  SPLASH_DURATION: 0.6, // s, 바늘이 물을 떠나거나 들어갈 때 웅덩이에 퍼지는 물결
  SETTLE_DURATION: 0.25, // s, 바늘이 물에 들어간 뒤 물결을 보여 주고 대기로 돌아가기까지
  // 설원 배경 (shared/assets/background/snowfield.jpg 기준). 이미지 안 눈밭이 시작하는 높이를 장면의 HORIZON_RATIO 에 맞춘다
  BACKGROUND_HORIZON_RATIO: 0.51,
  HORIZON_RATIO: 0.585, // 장면 높이 대비 눈밭이 시작하는 높이 (위쪽 하늘에 콘텐츠를 얹는다)
  // 해달·웅덩이 크기의 기준 길이 = min(SIZE_UNIT_MAX, 장면 너비 × SIZE_UNIT_WIDTH_RATIO).
  // 장면 높이와 상관없이 정해, 위쪽에 콘텐츠 자리를 늘려도 해달 크기는 그대로다. 좁은 화면에서는 너비에 맞춰 작게 그린다
  SIZE_UNIT_MAX: 352, // px
  SIZE_UNIT_WIDTH_RATIO: 0.86,
  // 해달 (OTTER_SCENE_FRAMES 기준). 눈밭에 엉덩이를 대고 앉는다
  OTTER_BODY_RATIO: 0.56, // 기준 길이 대비 해달 키 (모자 꼭대기 ~ 발 아래 끝)
  OTTER_X_RATIO: 0.66, // 장면 너비 대비 해달 몸 가운데 가로 위치 (왼쪽에 낚싯대가 뻗을 자리를 둔다)
  OTTER_GROUND_Y_RATIO: 0.843, // 장면 높이 대비 해달 발 아래 끝 높이 (장면 아래쪽은 카드가 덮는다)
  // 물웅덩이 (shared/assets/waterSurface/puddle.png 기준). 드리운 낚싯대 끝 바로 아래에 있다
  HOLE_TIP_OFFSET_RATIO: 0.03, // 기준 길이 대비, 드리운 낚싯대 끝에서 웅덩이 가운데까지 가로 (오른쪽 +)
  HOLE_Y_RATIO: 0.871, // 장면 높이 대비 웅덩이 가운데 높이 (해달보다 조금 앞)
  HOLE_RADIUS_RATIO: 0.14, // 기준 길이 대비 웅덩이 가로 반지름
  HOLE_ASPECT: 85 / 446, // 웅덩이 이미지 세로 / 가로
  // 낚싯줄 · 바늘
  LINE_HANG_RATIO: 0.17, // 기준 길이 대비, 잡은 뒤 낚싯대 끝에서 바늘까지 줄 길이
  LINE_SLACK: 8, // px, 드리웠을 때 줄이 아래로 처지는 정도
  BITE_TUG: 1.5, // px, 입질 때 줄 끝이 좌우로 떨리는 폭
  BITE_TUG_SPEED: 38, // rad/s
  BITE_PULL: 2, // px, 입질 때 줄 끝이 물속으로 당겨지는 정도
  FISH_HOOK_DROP: 0.45, // 바늘에서 물고기 중심까지 (물고기 크기 대비)
  FISH_SWING: 0.18, // rad, 매달린 물고기가 좌우로 흔들리는 각도
  FISH_SWING_SPEED: 5, // rad/s
  FISH_EMERGE: 0.25, // 챔질 중 물고기가 물 밖으로 나타나는 데 걸리는 비율 (챔질 시간 대비)
  // 해달 친구 (FRIEND_SCENE_FRAMES 기준). 웅덩이 왼쪽 뒤 눈밭에 앉는다 (낚싯대 끝·줄을 가리지 않게 작게, 뒤에)
  FRIEND_SCALE_RATIO: 0.65, // 해달 대비 친구 크기 (멀리 앉아 작게 보인다)
  FRIEND_X_RATIO: 0.12, // 장면 너비 대비 친구 몸 가운데 가로 위치 (좁으면 왼쪽 끝에 닿지 않게 오른쪽으로 민다)
  FRIEND_EDGE_MARGIN: 4, // px, 친구 그림 왼쪽 끝과 장면 왼쪽 끝 사이
  FRIEND_GROUND_Y_RATIO: 0.771, // 장면 높이 대비 친구 발 아래 끝 높이 (해달보다 뒤)
  FRIEND_CATCH_PERIOD: 6, // s, 친구가 물고기를 잡는 간격
  FRIEND_CATCH_OFFSET: 1.5, // s, 처음 잡는 시각
  FRIEND_LABEL_GAP: 6, // px, 친구 머리 위와 잡은 양 글자 사이
  FISHING_AREA_PADDING: 8, // px, 해달이 낚시하는 영역(해달·낚싯대·웅덩이)을 비출 때 둘레 여백
} as const;

const REEL_START = SCENE.BITE_DURATION;
const HOLD_START = REEL_START + SCENE.REEL_DURATION;
const CAST_START = HOLD_START + SCENE.HOLD_DURATION;
const CATCH_END = CAST_START + SCENE.CAST_DURATION;
/** 바늘이 다시 물에 들어가는 물결의 시작 (바늘이 수면에 닿기 조금 전) */
const REENTRY_SPLASH_START = CATCH_END - 0.1;
const SETTLE_END = CATCH_END + SCENE.SETTLE_DURATION;

/** 잡는 동작의 구간 시작 시각 (잡기 시작한 뒤 초). 3D 해달이 자세를 정할 때 쓴다 */
export const CATCH_TIMELINE = { REEL_START, HOLD_START, CAST_START, CATCH_END } as const;

/** 잡은 물고기를 줄 끝에 매달아 보여 주는 시간 (초). 동작 줄이기 모드에서 탭했을 때도 이만큼 보인다 */
export const HOLD_SECONDS = SCENE.HOLD_DURATION;

export type Point = { x: number; y: number };

/**
 * 장면에 그리는 해달 그림의 원본 크기와 기준점 (원본 px).
 * 프레임마다 이미지 크기·자세가 달라, 몸 가운데(centerX)와 발 아래 끝을 맞춰 같은 자리에 그린다.
 * 모든 이미지는 사방에 SPRITE_PADDING 만큼 투명 여백이 있다.
 */
export type SceneSpriteFrame = {
  width: number;
  height: number;
  /** 몸 가운데 가로 위치 */
  centerX: number;
};

const SPRITE_PADDING = 20;

/** 해달 프레임 (otter-sprites.ts 의 OTTER_FISHING_FRAMES 와 같은 순서). tip 은 그림 속 낚싯대 끝 */
export const OTTER_SCENE_FRAMES = [
  { width: 545, height: 509, centerX: 372, tip: { x: 22, y: 306 } }, // otter-fishing-idle.png
  { width: 554, height: 519, centerX: 372, tip: { x: 22, y: 247 } }, // otter-fishing-notice.png
  { width: 573, height: 493, centerX: 402, tip: { x: 22, y: 223 } }, // otter-fishing-pull.png
  { width: 529, height: 516, centerX: 354, tip: { x: 22, y: 41 } }, // otter-fishing-lift.png
  { width: 540, height: 514, centerX: 363, tip: { x: 22, y: 45 } }, // otter-fishing-caught.png
] as const satisfies readonly (SceneSpriteFrame & { tip: Point })[];

/** 해달 키 (otter-fishing-idle.png 의 모자 꼭대기 ~ 발 아래 끝, 원본 px). 크기를 정하는 기준 */
const OTTER_BODY_HEIGHT = 468;

/**
 * 해달 친구 프레임 (OTTER_FRIEND_FISHING_FRAMES 와 같은 순서, 낚싯대 없는 표정 그림).
 * otter-love → otter-surprised → otter-awkward → otter-excited → otter-happy
 */
export const FRIEND_SCENE_FRAMES = [
  { width: 398, height: 508, centerX: 159 },
  { width: 442, height: 531, centerX: 212 },
  { width: 403, height: 528, centerX: 168 },
  { width: 411, height: 513, centerX: 183 },
  { width: 455, height: 507, centerX: 212 },
] as const satisfies readonly SceneSpriteFrame[];

/** 친구 키 (otter-idle.png 기준 표정 그림의 모자 꼭대기 ~ 발 아래 끝, 원본 px) */
const FRIEND_BODY_HEIGHT = 491;

/** 해먹이 가득 찼을 때 그림 (otter-hammock-full.png, 선 모습). 몸 가운데·발 아래 끝을 낚시 해달과 같은 자리에 맞춘다 */
export const OTTER_FULL_FRAME = {
  width: 515,
  height: 622,
  centerX: 254,
} as const satisfies SceneSpriteFrame;

/** 가득 찬 그림은 머리가 낚시 그림보다 약 8% 크게 그려져 있어, 머리 크기가 같아지게 줄여 그린다 */
const FULL_FRAME_SCALE = 0.93;

/** 프레임 번호: 대기 → 알아챔(입질) → 당김(챔질 앞·뒤 절반) → 잡음 */
const FRAME = { IDLE: 0, NOTICE: 1, PULL: 2, LIFT: 3, CAUGHT: 4 } as const;

/** otter-happy.png 안 머리 가운데 가로 위치. 친구가 잡은 양 글자를 머리 위 가운데에 띄운다 */
export const CAUGHT_HEAD_X = 235;

/** 해달이 스스로 물고기를 잡는 간격 (초). 잡을 때 띄우는 양을 계산할 때 쓴다 */
export const CATCH_INTERVAL_SECONDS = SCENE.AUTO_CATCH_INTERVAL;

/** 해달 친구가 물고기를 잡는 간격 (초). 친구 몫으로 띄우는 양을 계산할 때 쓴다 */
export const FRIEND_CATCH_INTERVAL_SECONDS = SCENE.FRIEND_CATCH_PERIOD;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export function randomFishKind(random: Random): FishKind {
  return FISH_KINDS[Math.floor(random() * FISH_KINDS.length)] ?? FISH_KINDS[0];
}

type SceneSize = Pick<SceneState, 'width' | 'height'>;

export type Rect = { x: number; y: number; width: number; height: number };

/** 해달·웅덩이·낚싯대 크기의 기준 길이 */
function sizeUnit({ width }: SceneSize): number {
  return Math.min(SCENE.SIZE_UNIT_MAX, width * SCENE.SIZE_UNIT_WIDTH_RATIO);
}

/** 눈밭이 시작하는 높이 (배경 이미지를 여기에 맞춘다) */
export function horizonY(height: number): number {
  return height * SCENE.HORIZON_RATIO;
}

/**
 * 해달이 낚시하는 영역: 모든 낚시 프레임의 해달·낚싯대(들어 올린 모습 포함)와 물웅덩이를 감싸는 사각형.
 * 좌우 여백을 같게 맞춰 화면 가운데에 둔다 (해달 오른쪽 눈밭의 양동이는 넣지 않는다).
 * 튜토리얼이 장면 전체가 아니라 해달이 물고기를 잡는 곳만 비출 때 쓴다
 */
export function fishingArea(size: SceneSize): Rect {
  const hole = holeLayout(size);
  const rects: Rect[] = [
    ...otterLayout(size).frames,
    {
      x: hole.x - hole.radiusX,
      y: hole.y - hole.radiusY,
      width: hole.radiusX * 2,
      height: hole.radiusY * 2,
    },
  ];
  const padding = SCENE.FISHING_AREA_PADDING;
  const left = Math.max(0, Math.min(...rects.map((rect) => rect.x)) - padding);
  const top = Math.max(0, Math.min(...rects.map((rect) => rect.y)) - padding);
  const right = Math.max(...rects.map((rect) => rect.x + rect.width)) + padding;
  // 좁은 쪽 여백에 맞춰 양쪽 여백을 같게 한다
  const margin = Math.max(0, Math.min(left, size.width - right));
  const bottom = Math.min(
    size.height,
    Math.max(...rects.map((rect) => rect.y + rect.height)) + padding,
  );
  return { x: margin, y: top, width: size.width - margin * 2, height: bottom - top };
}

/** 물웅덩이 (가운데와 가로·세로 반지름). 드리운 낚싯대 끝 바로 아래에 둔다 */
export function holeLayout(size: SceneSize) {
  const unit = sizeUnit(size);
  const radiusX = unit * SCENE.HOLE_RADIUS_RATIO;
  const idleTip = otterTip(otterLayout(size), FRAME.IDLE);
  return {
    x: idleTip.x + unit * SCENE.HOLE_TIP_OFFSET_RATIO,
    y: size.height * SCENE.HOLE_Y_RATIO,
    radiusX,
    radiusY: radiusX * SCENE.HOLE_ASPECT,
  };
}

/** 몸 가운데·발 아래 끝을 (centerX, bottomY) 에 맞춘 그리기 영역 */
function spriteRect(
  frame: SceneSpriteFrame,
  centerX: number,
  bottomY: number,
  scale: number,
): Rect {
  return {
    x: centerX - frame.centerX * scale,
    y: bottomY - (frame.height - SPRITE_PADDING) * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

/** 눈밭에 앉은 해달의 프레임별 그리기 영역 */
export function otterLayout(size: SceneSize) {
  const scale = (sizeUnit(size) * SCENE.OTTER_BODY_RATIO) / OTTER_BODY_HEIGHT;
  const centerX = size.width * SCENE.OTTER_X_RATIO;
  const bottomY = size.height * SCENE.OTTER_GROUND_Y_RATIO;
  return {
    scale,
    centerX,
    bottomY,
    /** 해달 키 (모자 꼭대기 ~ 발 아래 끝, px) */
    bodyHeight: sizeUnit(size) * SCENE.OTTER_BODY_RATIO,
    frames: OTTER_SCENE_FRAMES.map((frame) => spriteRect(frame, centerX, bottomY, scale)),
    full: spriteRect(OTTER_FULL_FRAME, centerX, bottomY, scale * FULL_FRAME_SCALE),
  };
}

/** 해달 친구의 프레임별 그리기 영역. 웅덩이 왼쪽에 앉는다 */
export function otterFriendLayout(size: SceneSize) {
  const scale =
    (sizeUnit(size) * SCENE.OTTER_BODY_RATIO * SCENE.FRIEND_SCALE_RATIO) / FRIEND_BODY_HEIGHT;
  // 어느 프레임이든 그림 왼쪽 끝(여백 제외)이 장면 안에 들어오게 한다
  const leftReach = Math.max(...FRIEND_SCENE_FRAMES.map((frame) => frame.centerX - SPRITE_PADDING));
  const centerX = Math.max(
    size.width * SCENE.FRIEND_X_RATIO,
    leftReach * scale + SCENE.FRIEND_EDGE_MARGIN,
  );
  const bottomY = size.height * SCENE.FRIEND_GROUND_Y_RATIO;
  return {
    scale,
    frames: FRIEND_SCENE_FRAMES.map((frame) => spriteRect(frame, centerX, bottomY, scale)),
  };
}

/** 3D 눈사람 친구의 몸 가운데에서 든 팔 끝까지 (키 대비) */
const SNOWMAN_HALF_WIDTH_RATIO = 0.45;

/**
 * 3D 눈사람 친구가 서는 자리 (해달 친구 그림과 같은 자리·같은 키). 웅덩이 왼쪽 뒤 눈밭에 선다.
 * 팔을 들어도 장면 왼쪽 끝에 잘리지 않게 한다
 */
export function snowmanLayout(size: SceneSize) {
  const height = sizeUnit(size) * SCENE.OTTER_BODY_RATIO * SCENE.FRIEND_SCALE_RATIO;
  const halfWidth = height * SNOWMAN_HALF_WIDTH_RATIO;
  return {
    height,
    halfWidth,
    centerX: Math.max(size.width * SCENE.FRIEND_X_RATIO, halfWidth + SCENE.FRIEND_EDGE_MARGIN),
    bottomY: size.height * SCENE.FRIEND_GROUND_Y_RATIO,
  };
}

/** snowing 이 false 면 눈을 내리지 않는다 (동작 줄이기 모드는 멈춘 눈송이도 그리지 않는다) */
export function createSceneState(
  width: number,
  height: number,
  random: Random,
  snowing: boolean,
): SceneState {
  return {
    width,
    height,
    time: 0,
    catch: null,
    nextAutoCatchAt: SCENE.AUTO_CATCH_INTERVAL,
    hammockFull: false,
    snowfall: snowing ? createSnowfall(random, { width, height }) : null,
  };
}

/**
 * 해먹이 가득 찼는지 바꾼다. 하던 동작은 그대로 마친다.
 * 다시 비면(창고에 저장) 바로 잡지 않고 한 주기 뒤부터 다시 잡는다.
 */
export function setHammockFull(state: SceneState, hammockFull: boolean): SceneState {
  if (state.hammockFull === hammockFull) return state;
  return hammockFull
    ? { ...state, hammockFull }
    : { ...state, hammockFull, nextAutoCatchAt: state.time + SCENE.AUTO_CATCH_INTERVAL };
}

/** 가득 찬 모습(양동이를 든 해달)을 보여줄 때인지. 하던 동작이 끝난 뒤부터다 */
export function isShowingFull({ hammockFull, catch: current }: SceneState): boolean {
  return hammockFull && current === null;
}

/** 크기가 바뀌면 진행 중인 연출을 지우고 새 크기로 다시 시작한다 (눈도 새 크기에 다시 흩뿌린다) */
export function resizeScene(
  state: SceneState,
  width: number,
  height: number,
  random: Random,
): SceneState {
  return {
    ...createSceneState(width, height, random, state.snowfall !== null),
    time: state.time,
    nextAutoCatchAt: state.nextAutoCatchAt,
    hammockFull: state.hammockFull,
  };
}

/** 입질을 시작한다. 이미 잡는 중이면 그대로 둔다 */
export function requestCatch(state: SceneState, random: Random, labeled = false): SceneState {
  if (state.catch || state.hammockFull) return state;
  return {
    ...state,
    catch: {
      kind: randomFishKind(random),
      size: between(random, SCENE.FISH_MIN_SIZE, SCENE.FISH_MAX_SIZE),
      startedAt: state.time,
      labeled,
    },
    nextAutoCatchAt: state.time + SCENE.AUTO_CATCH_INTERVAL,
  };
}

/**
 * 동작 줄이기 모드: 입질·챔질 없이 바로 잡은 모습(물고기가 줄 끝에 매달림)을 보인다.
 * 시각이 흐르지 않으므로 끝낼 때는 endCatch 를 부른다.
 */
export function showCaught(state: SceneState, random: Random): SceneState {
  if (state.hammockFull) return state;
  return {
    ...state,
    catch: {
      kind: randomFishKind(random),
      size: SCENE.FISH_MAX_SIZE,
      startedAt: state.time - HOLD_START,
      labeled: false,
    },
  };
}

export function endCatch(state: SceneState): SceneState {
  return { ...state, catch: null };
}

/** 한 프레임 진행. autoCatch 가 true 면 일정 주기로 스스로 물고기를 잡는다 */
export function stepScene(
  state: SceneState,
  dt: number,
  random: Random,
  autoCatch: boolean,
): SceneState {
  const time = state.time + dt;
  const finished = state.catch !== null && time - state.catch.startedAt >= SETTLE_END;
  const advanced: SceneState = {
    ...state,
    time,
    catch: finished ? null : state.catch,
    // 해먹이 가득 차 낚시를 멈춰도 눈은 계속 내린다
    snowfall: state.snowfall && stepSnowfall(state.snowfall, dt, random, state),
  };
  return autoCatch && !advanced.hammockFull && time >= advanced.nextAutoCatchAt
    ? requestCatch(advanced, random, true)
    : advanced;
}

/** 잡기 시작한 뒤 지난 시간 (초). 대기 중이면 null */
export function catchElapsed({ catch: current, time }: SceneState): number | null {
  return current ? time - current.startedAt : null;
}

/** 잡는 동작을 시작한 지 elapsed 초 뒤의 프레임 (해달·친구 같이 쓴다) */
function framesAt(elapsed: number | null): number {
  if (elapsed === null || elapsed >= CAST_START) return FRAME.IDLE;
  if (elapsed < REEL_START) return FRAME.NOTICE;
  if (elapsed < HOLD_START) {
    return elapsed < REEL_START + SCENE.REEL_DURATION / 2 ? FRAME.PULL : FRAME.LIFT;
  }
  return FRAME.CAUGHT;
}

/** 지금 그릴 해달 프레임 */
export function otterFrame(state: SceneState): number {
  return framesAt(catchElapsed(state));
}

/** 해달 친구가 잡는 동작을 시작한 뒤 지난 시간 (초). 아직 시작 전이거나 동작이 끝났으면 null */
/**
 * 해달 친구가 이번 주기를 시작한 뒤 지난 시간 (초). 아직 처음 잡기 전이거나 해먹이 가득 찼으면 null.
 * 3D 눈사람 친구는 잡은 뒤 팔을 내리는 동작까지 이어 가므로 주기 전체를 돌려준다
 */
export function friendPhase({ time, hammockFull }: SceneState): number | null {
  const sinceFirst = time - SCENE.FRIEND_CATCH_OFFSET;
  if (hammockFull || sinceFirst < 0) return null;
  return sinceFirst % SCENE.FRIEND_CATCH_PERIOD;
}

function friendCatchElapsed(time: number): number | null {
  const sinceFirst = time - SCENE.FRIEND_CATCH_OFFSET;
  if (sinceFirst < 0) return null;
  const phase = sinceFirst % SCENE.FRIEND_CATCH_PERIOD;
  return phase < CAST_START ? phase : null;
}

/**
 * 지금 그릴 해달 친구 프레임. 장면 시각만으로 정해지는 반복 연출이라 상태를 따로 두지 않는다.
 * 시각 0 에서는 기다리는 모습이다 (동작 줄이기 모드는 시각이 흐르지 않아 계속 기다린다).
 */
export function friendFrame({ time, hammockFull }: SceneState): number {
  // 해먹이 가득 차면 친구도 잡지 않고 기다린다
  return hammockFull ? FRAME.IDLE : framesAt(friendCatchElapsed(time));
}

/** elapsed 가 [start, end) 안에서 나타났다 사라지는 페이드 (0~1) */
function windowOpacity(elapsed: number | null, start: number, end: number): number {
  if (elapsed === null || elapsed < start || elapsed >= end) return 0;
  return clamp01(Math.min((elapsed - start) / SCENE.FADE, (end - elapsed) / SCENE.FADE));
}

/** 해달 친구가 잡은 양 글자의 불투명도. 잡은 모습이 되면 나타나고 동작이 끝날 때 사라진다 */
export function friendCatchLabelOpacity(time: number): number {
  return windowOpacity(friendCatchElapsed(time), HOLD_START, CAST_START);
}

/** 잡은 양 글자의 불투명도. 물고기가 줄 끝에 매달려 있는 동안 보인다 */
export function catchLabelOpacity(state: SceneState): number {
  if (!state.catch?.labeled) return 0;
  return windowOpacity(catchElapsed(state), HOLD_START, CAST_START);
}

/** 프레임 그림 속 낚싯대 끝의 장면 좌표 */
function otterTip(otter: ReturnType<typeof otterLayout>, frame: number): Point {
  const rect = otter.frames[frame];
  const tip = OTTER_SCENE_FRAMES[frame]?.tip;
  if (!rect || !tip) return { x: 0, y: 0 };
  return { x: rect.x + tip.x * otter.scale, y: rect.y + tip.y * otter.scale };
}

/** 지금 프레임의 낚싯대 끝 */
export function rodTip(state: SceneState): Point {
  return otterTip(otterLayout(state), otterFrame(state));
}

/** 줄이 웅덩이 수면에 들어가는 자리. 입질 때는 물고기가 바늘을 물어 툭툭 당겨진다 */
function waterEntry(state: SceneState, elapsed: number | null): Point {
  const hole = holeLayout(state);
  if (elapsed === null || elapsed >= REEL_START) return { x: hole.x, y: hole.y };
  // 입질: 점점 세게 당겨지며 좌우로 떨린다
  const progress = clamp01(elapsed / SCENE.BITE_DURATION);
  const tug = Math.sin(elapsed * SCENE.BITE_TUG_SPEED) * SCENE.BITE_TUG * progress;
  return { x: hole.x + tug, y: hole.y + SCENE.BITE_PULL * easeOut(progress) };
}

/** 줄 끝(바늘)이 물 밖으로 나와 있는 정도 (0 = 웅덩이 안, 1 = 낚싯대 끝 아래에 매달림) */
function hookOut(elapsed: number | null): number {
  if (elapsed === null || elapsed < REEL_START) return 0;
  if (elapsed < HOLD_START) return easeOut((elapsed - REEL_START) / SCENE.REEL_DURATION);
  if (elapsed < CAST_START) return 1;
  return 1 - easeInOut(clamp01((elapsed - CAST_START) / SCENE.CAST_DURATION));
}

export type FishingLine = {
  /** 낚싯대 끝 (줄이 시작하는 곳) */
  tip: Point;
  /** 줄 끝 (바늘). 물속에 있으면 웅덩이 가운데 */
  hook: Point;
  /** 줄이 처진 정도 (px). 물고기를 끌어올리는 동안은 팽팽해서 0 */
  slack: number;
  /** 줄이 웅덩이 수면에 들어가는 자리 (바늘이 물속에 있을 때 줄은 여기까지 보인다) */
  entry: Point;
  /** 바늘에 매달린 물고기. 물 밖에 없으면 null */
  fish: { kind: FishKind; size: number; center: Point; swing: number; opacity: number } | null;
};

/**
 * 줄·바늘·매달린 물고기의 지금 모습.
 * tipOverride 를 주면 그림 속 낚싯대 끝 대신 그 자리에서 줄이 시작한다 (3D 해달의 낚싯대 끝).
 */
export function fishingLine(state: SceneState, tipOverride?: Point): FishingLine {
  const elapsed = catchElapsed(state);
  const tip = tipOverride ?? rodTip(state);
  const hole = holeLayout(state);
  const unit = sizeUnit(state);
  const out = hookOut(elapsed);

  if (out === 0) {
    const entry = waterEntry(state, elapsed);
    return { tip, hook: hole, slack: SCENE.LINE_SLACK, entry, fish: null };
  }

  // 바늘은 웅덩이에서 낚싯대 끝 아래 매달리는 자리까지 올라온다
  const hang = { x: tip.x, y: tip.y + unit * SCENE.LINE_HANG_RATIO };
  const hook = { x: lerp(hole.x, hang.x, out), y: lerp(hole.y, hang.y, out) };
  const entry = { x: hole.x, y: hole.y };

  const current = state.catch;
  if (!current || elapsed === null) return { tip, hook, slack: 0, entry, fish: null };
  // 물고기는 챔질 초반에 물 밖으로 나타나고, 던지기 전에 사라진다
  const opacity = Math.min(
    clamp01((elapsed - REEL_START) / (SCENE.REEL_DURATION * SCENE.FISH_EMERGE)),
    clamp01((CAST_START - elapsed) / SCENE.FADE),
  );
  const sinceHold = Math.max(elapsed - REEL_START, 0);
  const swing = Math.sin(sinceHold * SCENE.FISH_SWING_SPEED) * SCENE.FISH_SWING * out;
  const fish =
    opacity > 0
      ? {
          kind: current.kind,
          size: current.size,
          center: { x: hook.x, y: hook.y + current.size * SCENE.FISH_HOOK_DROP },
          swing,
          opacity,
        }
      : null;
  return { tip, hook, slack: 0, entry, fish };
}

/**
 * 웅덩이에 퍼지는 물결들의 진행도 (0~1): 입질이 올 때(작게), 바늘이 물을 떠날 때, 다시 들어갈 때.
 * 퍼지는 중인 물결만 돌려준다.
 */
export function splashProgresses(state: SceneState): { t: number; small: boolean }[] {
  const elapsed = catchElapsed(state);
  if (elapsed === null) return [];
  const ripples = [
    { start: 0, small: true },
    { start: REEL_START, small: false },
    { start: REENTRY_SPLASH_START, small: false },
  ];
  return ripples
    .map(({ start, small }) => ({ t: (elapsed - start) / SCENE.SPLASH_DURATION, small }))
    .filter(({ t }) => t >= 0 && t < 1);
}
