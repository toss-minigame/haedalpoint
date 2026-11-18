import type { SnowmanView } from '../otter-3d/snowman-pose';
import {
  CAUGHT_HEAD_X,
  catchLabelOpacity,
  type FishingLine,
  type FishKind,
  fishingLine,
  friendCatchLabelOpacity,
  friendFrame,
  holeLayout,
  horizonY,
  isShowingFull,
  otterFrame,
  otterFriendLayout,
  otterLayout,
  type Point,
  type Rect,
  SCENE,
  type SceneState,
  snowmanLayout,
  splashProgresses,
} from './scene-state';
import { drawSnowfall } from './snow/snow-render';

export type FishImages = Record<FishKind, HTMLImageElement>;

export type SceneSprites = {
  /** 해달 프레임 (0 = 기다리는 모습, 마지막 = 잡은 모습) */
  otter: readonly HTMLImageElement[];
  /** 해먹이 가득 찼을 때 해달 (물고기가 가득한 양동이를 든 모습) */
  full: HTMLImageElement | null;
  fish: FishImages;
  background: HTMLImageElement;
  puddle: HTMLImageElement;
};

/**
 * 해달(과 해달 친구인 눈사람)을 그리는 3D 모델 (otter-3d). 해먹이 가득 차면 낚싯대를 치우고 양동이를 든 모습으로 넘어간다.
 * draw 는 해달을 그리고 낚싯대 끝의 장면 좌표를 돌려준다 (줄이 여기서 시작한다). 낚싯대를 치웠으면 null.
 */
export type OtterModelView = {
  draw: (ctx: CanvasRenderingContext2D, state: SceneState, friend: SnowmanView) => Point | null;
  /** 해달 친구(눈사람)를 불러와 그리고 있는지. 아니면 친구 몫 글자도 띄우지 않는다 */
  hasFriend: () => boolean;
  /** 사용자가 끌어서 돌린 각도 (rad, 0 = 원래 방향). 다음 draw 부터 반영한다 */
  setUserYaw: (yaw: number) => void;
  dispose: () => void;
};

/** 함께 낚시하는 해달 친구. 그림을 못 불러왔으면 frames 가 null 이라 그리지 않는다 */
export type SceneFriend = {
  /** 친구가 와서 함께 낚시하는 중인지 */
  visible: boolean;
  /** 녹은 정도 (0 = 멀쩡, 1 = 다 녹음). 떠나기 전 한 시간 동안 커진다 (3D 눈사람만) */
  melt: number;
  /** 친구가 없을 때 출석으로 만드는 중인 눈사람 단계 (0 = 없음 … 6 = 완성. 3D 눈사람만) */
  buildStage: number;
  /** 눈사람을 얼린 장면 시각 (초). 얼린 적이 없으면 null (3D 눈사람만) */
  frozenAt: number | null;
  /** 친구 프레임 (해달 프레임과 같은 순서) */
  frames: readonly HTMLImageElement[] | null;
  /** 물고기를 잡을 때 머리 위에 띄울 글자 (친구 몫, 예: +3). null 이면 띄우지 않는다 */
  catchLabel: string | null;
};

// 장면 색 토큰 (캔버스는 CSS 변수를 직접 못 쓰므로 여기 한 곳에 모은다)
const PALETTE = {
  // 배경 이미지를 못 불러왔을 때만 쓰는 하늘·눈밭 (설원 배경 색과 맞춘다)
  skyTop: '#dceafa',
  skyBottom: '#eef5fd',
  snowTop: '#f4f8fe',
  snowBottom: '#e3eefb',
  // 설원 배경 이미지 맨 위 하늘 색. 이미지보다 장면 위쪽이 더 높으면 이 색으로 이어 칠한다
  backgroundSkyTop: '#dcecfd',
  // 웅덩이 이미지를 못 불러왔을 때 그리는 물 색 (웅덩이 이미지 색과 맞춘다)
  puddle: '#9acee5',
  splash: 'rgba(255, 255, 255, 0.95)',
  line: 'rgba(60, 72, 96, 0.75)',
  // 잡은 양 글자. 하늘·눈밭 어느 배경 위에서도 읽히도록 흰 글자에 짙은 파란 테두리를 두른다
  catchLabel: '#ffffff',
  catchLabelOutline: 'rgba(30, 70, 120, 0.85)',
} as const;

const FISH_EMOJI = '🐟';
const CATCH_LABEL_FONT = '600 13px system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif';
const CATCH_LABEL_OUTLINE_WIDTH = 3; // px
const CATCH_LABEL_GAP = 0.7; // 매달린 물고기 중심에서 글자까지 (물고기 크기 대비)
const CATCH_LABEL_EDGE_MARGIN = 4; // px, 화면 오른쪽 끝과 글자 사이
const LINE_WIDTH = 1.2; // px
const SMALL_RIPPLE_SCALE = 0.5; // 입질 물결 크기 (큰 물결 대비)
const EMOJI_FONT =
  '"Tossface", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** 배경 이미지를 못 불러왔을 때 그리는 단색 그라데이션 하늘·눈밭 */
function drawFallbackBackground(ctx: CanvasRenderingContext2D, { width, height }: SceneState) {
  const groundY = horizonY(height);
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);
  const snow = ctx.createLinearGradient(0, groundY, 0, height);
  snow.addColorStop(0, PALETTE.snowTop);
  snow.addColorStop(1, PALETTE.snowBottom);
  ctx.fillStyle = snow;
  ctx.fillRect(0, groundY, width, height - groundY);
}

/**
 * 설원 배경. 이미지의 눈밭 시작선을 장면의 눈밭 시작선에 맞추고, 너비와 눈밭(아래쪽)을 빈틈없이 덮는 배율로 그린다.
 * 위쪽 하늘은 배율을 정하는 데 쓰지 않는다 (장면 위쪽을 늘려도 배경이 커지지 않게). 모자라는 위쪽은 하늘 색으로 칠한다.
 * 넘치는 가로는 왼쪽을 잘라 오른쪽 이글루가 보이게 한다.
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  { width, height }: SceneState,
  image: HTMLImageElement,
) {
  const groundY = horizonY(height);
  const horizon = image.naturalHeight * SCENE.BACKGROUND_HORIZON_RATIO;
  const scale = Math.max(
    width / image.naturalWidth,
    (height - groundY) / (image.naturalHeight - horizon),
  );
  const drawWidth = image.naturalWidth * scale;
  const top = groundY - horizon * scale;
  if (top > 0) {
    ctx.fillStyle = PALETTE.backgroundSkyTop;
    // 이미지와 맞닿는 줄에 틈이 생기지 않게 1px 겹친다
    ctx.fillRect(0, 0, width, Math.ceil(top) + 1);
  }
  ctx.drawImage(image, width - drawWidth, top, drawWidth, image.naturalHeight * scale);
}

/** 해달 앞 물웅덩이. 이미지를 못 불러왔으면 같은 색 타원으로 대신한다 */
function drawPuddle(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  image: HTMLImageElement | null,
) {
  const hole = holeLayout(state);
  if (image) {
    const { radiusX: rx, radiusY: ry } = hole;
    ctx.drawImage(image, hole.x - rx, hole.y - ry, rx * 2, ry * 2);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, hole.radiusX, hole.radiusY, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.puddle;
  ctx.fill();
  ctx.restore();
}

/**
 * 물고기 한 마리를 현재 원점(0, 0) 중심에 그린다. 긴 변이 size.
 * 이미지를 아직 못 불러왔으면 🐟 이모지로 대신한다.
 */
function drawFishBody(
  ctx: CanvasRenderingContext2D,
  kind: FishKind,
  size: number,
  facingRight: boolean,
  images: FishImages | null,
) {
  // 물고기 이미지와 🐟 이모지는 모두 왼쪽을 바라보므로 오른쪽으로 갈 때 좌우 반전
  if (facingRight) ctx.scale(-1, 1);
  if (!images) {
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(FISH_EMOJI, 0, 0);
    return;
  }
  const image = images[kind];
  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
}

/** 바늘에 매달린 물고기. 입이 바늘을 향하게 머리를 위로 세우고, 바늘을 축으로 흔들린다 */
function drawHangingFish(
  ctx: CanvasRenderingContext2D,
  line: FishingLine,
  images: FishImages | null,
) {
  const { fish, hook } = line;
  if (!fish) return;
  ctx.save();
  ctx.globalAlpha = fish.opacity;
  ctx.translate(hook.x, hook.y);
  ctx.rotate(fish.swing);
  ctx.translate(fish.center.x - hook.x, fish.center.y - hook.y);
  // 물고기 그림은 왼쪽을 바라보므로 90° 돌려 입을 위(바늘)로 향하게 한다
  ctx.rotate(Math.PI / 2);
  drawFishBody(ctx, fish.kind, fish.size, false, images);
  ctx.restore();
}

/** 낚싯대 끝에서 웅덩이 수면(바늘이 물속일 때) 또는 바늘(물 밖일 때)까지 줄. 드리웠을 때는 살짝 처진다 */
function drawLine(ctx: CanvasRenderingContext2D, line: FishingLine) {
  const end = line.slack === 0 ? line.hook : line.entry;
  ctx.save();
  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(line.tip.x, line.tip.y);
  ctx.quadraticCurveTo(
    (line.tip.x + end.x) / 2,
    (line.tip.y + end.y) / 2 + line.slack,
    end.x,
    end.y,
  );
  ctx.stroke();
  ctx.restore();
}

/** 잡은 양 글자. 하늘·눈밭 어느 배경에서도 읽히게 흰 글자에 짙은 파란 테두리를 두른다 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  opacity: number,
) {
  ctx.save();
  ctx.font = CATCH_LABEL_FONT;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = CATCH_LABEL_OUTLINE_WIDTH;
  ctx.strokeStyle = PALETTE.catchLabelOutline;
  ctx.fillStyle = PALETTE.catchLabel;
  ctx.globalAlpha = opacity;
  ctx.strokeText(label, x, y);
  ctx.fillText(label, x, y);
  ctx.restore();
}

/** 자동으로 잡은 물고기 옆에 잡은 양(예: +3)을 띄운다. 매달린 물고기와 함께 사라진다 */
function drawCatchLabel(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  line: FishingLine,
  label: string | null,
) {
  const opacity = catchLabelOpacity(state);
  if (!label || !line.fish || opacity === 0) return;
  const { center, size } = line.fish;
  ctx.save();
  ctx.font = CATCH_LABEL_FONT;
  const maxX = state.width - ctx.measureText(label).width - CATCH_LABEL_EDGE_MARGIN;
  ctx.restore();
  const labelX = Math.min(center.x + size * CATCH_LABEL_GAP, maxX);
  drawLabel(ctx, label, labelX, center.y, 'left', opacity);
}

/** 해달 친구가 물고기를 잡은 동안 머리 위 가운데에 친구 몫을 띄운다 (잡은 모습과 함께 나타나고 사라진다) */
function drawFriendCatchLabel(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  friend: SceneFriend,
  friendIn3d: boolean,
) {
  const opacity = friendCatchLabelOpacity(state.time);
  // 녹는 동안에는 잡는 시늉을 하지 않고 머리 위에 말풍선이 뜨므로, 친구 몫 글자를 띄우지 않는다
  if (!friend.visible || friend.melt > 0 || !friend.catchLabel || opacity === 0) return;
  const head = friendIn3d ? snowmanHead(state) : friendSpriteHead(state, friend);
  if (!head) return;
  ctx.save();
  ctx.font = CATCH_LABEL_FONT;
  const halfWidth = ctx.measureText(friend.catchLabel).width / 2;
  ctx.restore();
  // 친구는 화면 왼쪽 끝에 있으므로 글자가 왼쪽으로 잘리지 않게 한다
  const centerX = Math.max(head.x, halfWidth + CATCH_LABEL_EDGE_MARGIN);
  drawLabel(ctx, friend.catchLabel, centerX, head.y - SCENE.FRIEND_LABEL_GAP, 'center', opacity);
}

/** 그림 해달 친구의 머리 위 가운데 (잡은 모습 기준). 그림을 못 불러왔으면 null */
function friendSpriteHead(state: SceneState, friend: SceneFriend): Point | null {
  if (!friend.frames) return null;
  const { frames, scale } = otterFriendLayout(state);
  const rect = frames.at(-1);
  return rect ? { x: rect.x + CAUGHT_HEAD_X * scale, y: rect.y } : null;
}

/** 3D 눈사람 친구의 머리 위 가운데 */
function snowmanHead(state: SceneState): Point {
  const { centerX, bottomY, height } = snowmanLayout(state);
  return { x: centerX, y: bottomY - height };
}

/** 입질·바늘이 물을 떠나거나 들어갈 때 웅덩이에 퍼지는 물결 */
function drawSplash(ctx: CanvasRenderingContext2D, state: SceneState) {
  const hole = holeLayout(state);
  for (const { t, small } of splashProgresses(state)) {
    const size = small ? SMALL_RIPPLE_SCALE : 1;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = PALETTE.splash;
    ctx.lineWidth = small ? 1.5 : 2;
    ctx.beginPath();
    ctx.ellipse(
      hole.x,
      hole.y,
      (6 + t * hole.radiusX) * size,
      (2 + t * hole.radiusY) * size,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  rect: Rect | undefined,
) {
  if (image && rect) ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

/** 해달. 잡는 동작은 프레임을 바꿔 가며 보인다 (몸 가운데와 발 아래 끝을 맞춰 그린다) */
function drawOtter(ctx: CanvasRenderingContext2D, state: SceneState, sprites: SceneSprites) {
  const layout = otterLayout(state);
  if (isShowingFull(state)) {
    drawFrame(ctx, sprites.full ?? undefined, layout.full);
    return;
  }
  const frame = otterFrame(state);
  drawFrame(ctx, sprites.otter[frame], layout.frames[frame]);
}

function drawOtterFriend(ctx: CanvasRenderingContext2D, state: SceneState, friend: SceneFriend) {
  if (!friend.visible || !friend.frames) return;
  const frame = friendFrame(state);
  drawFrame(ctx, friend.frames[frame], otterFriendLayout(state).frames[frame]);
}

function friendView(state: SceneState, friend: SceneFriend): SnowmanView {
  return {
    alive: friend.visible,
    melt: friend.melt,
    buildStage: friend.buildStage,
    freezeElapsed: friend.frozenAt === null ? null : state.time - friend.frozenAt,
  };
}

/** 장면 한 프레임을 그린다. 좌표는 CSS px 기준 (devicePixelRatio 변환은 호출 측에서 설정) */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  sprites: SceneSprites | null,
  catchLabel: string | null,
  friend: SceneFriend,
  otterModel: OtterModelView | 'pending' | null = null,
) {
  ctx.clearRect(0, 0, state.width, state.height);
  if (sprites) drawBackground(ctx, state, sprites.background);
  else drawFallbackBackground(ctx, state);
  // 눈은 배경에만 내린다 (해달·웅덩이·물고기 뒤로 지나가, 해달 얼굴과 매달린 물고기를 가리지 않는다)
  if (state.snowfall) drawSnowfall(ctx, state.snowfall);

  // 웅덩이는 눈밭에 있으므로 해달들보다 먼저 그린다
  drawPuddle(ctx, state, sprites?.puddle ?? null);
  drawSplash(ctx, state);
  // 3D 해달이면 친구도 3D 눈사람으로 함께 그린다. 3D 를 불러오는 중이거나 못 불러와도 그림 친구로 대신하지 않는다
  const friendIn3d = otterModel !== null;
  if (sprites && !friendIn3d) drawOtterFriend(ctx, state, friend);
  // 3D 해달은 양동이를 든 모습까지 스스로 그린다. 낚싯대를 쥐고 있는 동안만 낚싯대 끝을 돌려준다
  // 3D 모델을 불러오는 동안('pending')은 해달과 줄을 그리지 않는다 (옛 그림 해달로 대신하지 않는다)
  if (otterModel === 'pending') return;
  const modelTip = otterModel ? otterModel.draw(ctx, state, friendView(state, friend)) : null;
  if (sprites && !otterModel) drawOtter(ctx, state, sprites);

  // 줄은 낚싯대 끝(그림 속, 또는 3D 모델)에서 시작한다. 해먹이 가득 차 양동이를 든 동안은 낚싯대가 없다
  if (otterModel ? modelTip !== null : !isShowingFull(state)) {
    const line = fishingLine(state, modelTip ?? undefined);
    drawLine(ctx, line);
    drawHangingFish(ctx, line, sprites?.fish ?? null);
    if (sprites) drawCatchLabel(ctx, state, line, catchLabel);
  }
  // 눈사람을 아직 못 불러왔으면 친구가 보이지 않으므로 친구 몫 글자도 띄우지 않는다
  if (!otterModel || otterModel.hasFriend()) drawFriendCatchLabel(ctx, state, friend, friendIn3d);
}
