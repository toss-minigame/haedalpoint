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
  type Rect,
  SCENE,
  type SceneState,
  splashProgresses,
} from './scene-state';

export type FishImages = Record<FishKind, HTMLImageElement>;

export type SceneSprites = {
  /** 해달 프레임 (0 = 기다리는 모습, 마지막 = 잡은 모습) */
  otter: readonly HTMLImageElement[];
  /** 해먹이 가득 찼을 때 해달 (물고기가 가득한 양동이를 든 모습) */
  full: HTMLImageElement;
  fish: FishImages;
  background: HTMLImageElement;
  puddle: HTMLImageElement;
};

/** 함께 낚시하는 해달 친구. 그림을 못 불러왔으면 frames 가 null 이라 그리지 않는다 */
export type SceneFriend = {
  visible: boolean;
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
) {
  const opacity = friendCatchLabelOpacity(state.time);
  if (!friend.visible || !friend.frames || !friend.catchLabel || opacity === 0) return;
  const { frames, scale } = otterFriendLayout(state);
  const rect = frames.at(-1);
  if (!rect) return;
  ctx.save();
  ctx.font = CATCH_LABEL_FONT;
  const halfWidth = ctx.measureText(friend.catchLabel).width / 2;
  ctx.restore();
  // 친구는 화면 왼쪽 끝에 앉으므로 글자가 왼쪽으로 잘리지 않게 한다
  const centerX = Math.max(rect.x + CAUGHT_HEAD_X * scale, halfWidth + CATCH_LABEL_EDGE_MARGIN);
  drawLabel(ctx, friend.catchLabel, centerX, rect.y - SCENE.FRIEND_LABEL_GAP, 'center', opacity);
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
    drawFrame(ctx, sprites.full, layout.full);
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

/** 장면 한 프레임을 그린다. 좌표는 CSS px 기준 (devicePixelRatio 변환은 호출 측에서 설정) */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  sprites: SceneSprites | null,
  catchLabel: string | null,
  friend: SceneFriend,
) {
  ctx.clearRect(0, 0, state.width, state.height);
  if (sprites) drawBackground(ctx, state, sprites.background);
  else drawFallbackBackground(ctx, state);

  // 웅덩이는 눈밭에 있으므로 해달들보다 먼저 그린다
  drawPuddle(ctx, state, sprites?.puddle ?? null);
  drawSplash(ctx, state);
  if (sprites) {
    drawOtterFriend(ctx, state, friend);
    drawOtter(ctx, state, sprites);
  }

  // 줄은 그림 속 낚싯대 끝에서 시작한다. 해먹이 가득 차 양동이를 든 동안은 낚싯대가 없다
  if (!isShowingFull(state)) {
    const line = fishingLine(state);
    drawLine(ctx, line);
    drawHangingFish(ctx, line, sprites?.fish ?? null);
    if (sprites) drawCatchLabel(ctx, state, line, catchLabel);
  }
  drawFriendCatchLabel(ctx, state, friend);
}
