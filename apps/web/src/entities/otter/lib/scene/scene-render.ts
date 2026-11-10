import {
  type FishKind,
  happyBlend,
  hookedFishCenter,
  hookedFishOpacity,
  hookedFishSwing,
  jumpPosition,
  otterLayout,
  pierLayout,
  SCENE,
  type SceneState,
  waterLineY,
} from './scene-state';

export type FishImages = Record<FishKind, HTMLImageElement>;

export type SceneSprites = {
  idle: HTMLImageElement;
  happy: HTMLImageElement;
  pier: HTMLImageElement;
  fish: FishImages;
  background: HTMLImageElement;
  wave: HTMLImageElement;
};

// 장면 색 토큰 (캔버스는 CSS 변수를 직접 못 쓰므로 여기 한 곳에 모은다)
const PALETTE = {
  // 배경 이미지를 못 불러왔을 때만 쓰는 하늘·바다
  skyTop: '#cfe9f8',
  skyBottom: '#f1f9fd',
  waterTop: '#7cc3e2',
  waterBottom: '#2e7aa8',
  // 물속(선착장 기둥 아래쪽·헤엄치는 물고기)을 살짝 덮는 색. 배경 수면 아래 색과 맞춘다
  underwater: 'rgba(95, 195, 222, 0.35)',
  splash: 'rgba(255, 255, 255, 0.9)',
  // 잡은 양 글자. 하늘·바다 어느 배경 위에서도 읽히도록 흰 글자에 짙은 바다색 테두리를 두른다
  catchLabel: '#ffffff',
  catchLabelOutline: 'rgba(16, 64, 96, 0.85)',
} as const;

const FISH_EMOJI = '🐟';
const CATCH_LABEL_FONT = '600 13px system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif';
const CATCH_LABEL_OUTLINE_WIDTH = 3; // px
const CATCH_LABEL_GAP = 0.7; // 매달린 물고기 중심에서 글자까지 (물고기 크기 대비)
const CATCH_LABEL_EDGE_MARGIN = 4; // px, 화면 오른쪽 끝과 글자 사이
const EMOJI_FONT =
  '"Tossface", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** 배경 이미지를 못 불러왔을 때 그리는 단색 그라데이션 하늘·바다 */
function drawFallbackBackground(ctx: CanvasRenderingContext2D, { width, height }: SceneState) {
  const waterY = waterLineY(height);
  const sky = ctx.createLinearGradient(0, 0, 0, waterY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, waterY);
  const water = ctx.createLinearGradient(0, waterY, 0, height);
  water.addColorStop(0, PALETTE.waterTop);
  water.addColorStop(1, PALETTE.waterBottom);
  ctx.fillStyle = water;
  ctx.fillRect(0, waterY, width, height - waterY);
}

/**
 * 하늘·바다 배경. 이미지의 수평선을 장면 수면에 맞추고 장면을 빈틈없이 덮는다.
 * 넘치는 가로는 왼쪽을 잘라 오른쪽 위 구름이 보이게 한다.
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  { width, height }: SceneState,
  image: HTMLImageElement,
) {
  const waterY = waterLineY(height);
  const horizon = image.naturalHeight * SCENE.BACKGROUND_HORIZON_RATIO;
  const scale = Math.max(
    width / image.naturalWidth,
    waterY / horizon,
    (height - waterY) / (image.naturalHeight - horizon),
  );
  const drawWidth = image.naturalWidth * scale;
  ctx.drawImage(
    image,
    width - drawWidth,
    waterY - horizon * scale,
    drawWidth,
    image.naturalHeight * scale,
  );
}

function drawUnderwater(ctx: CanvasRenderingContext2D, { width, height }: SceneState) {
  const waterY = waterLineY(height);
  ctx.fillStyle = PALETTE.underwater;
  ctx.fillRect(0, waterY, width, height - waterY);
}

/** 수면 파도 띠. 같은 이미지를 가로로 이어 붙여 천천히 흘린다 (이미지 양 끝이 이어지는 모양) */
function drawWaves(
  ctx: CanvasRenderingContext2D,
  { width, height, time }: SceneState,
  image: HTMLImageElement,
) {
  const tileWidth = SCENE.WAVE_TILE_WIDTH;
  const tileHeight = (tileWidth * image.naturalHeight) / image.naturalWidth;
  const y = waterLineY(height) - tileHeight * SCENE.WAVE_SURFACE_Y_RATIO;
  // 타일 너비와 위치를 정수 px 로 맞춰 타일 사이에 틈이나 겹침 선이 생기지 않게 한다
  const offset = Math.floor((time * SCENE.WAVE_SCROLL_SPEED) % tileWidth);
  for (let x = -offset; x < width; x += tileWidth) {
    ctx.drawImage(image, x, y, tileWidth, tileHeight);
  }
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

function drawFish(
  ctx: CanvasRenderingContext2D,
  fish: { kind: FishKind; x: number; y: number; size: number },
  facingRight: boolean,
  images: FishImages | null,
) {
  ctx.save();
  ctx.translate(fish.x, fish.y);
  drawFishBody(ctx, fish.kind, fish.size, facingRight, images);
  ctx.restore();
}

/** 바늘에 걸린 물고기. 바늘 끝을 축으로 살짝 흔들린다 */
function drawHookedFish(ctx: CanvasRenderingContext2D, state: SceneState, images: FishImages) {
  const opacity = hookedFishOpacity(state);
  if (!state.hooked || opacity === 0) return;
  const { hookX, hookY } = otterLayout(state);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(hookX, hookY);
  ctx.rotate(hookedFishSwing(state));
  ctx.translate(0, state.hooked.size * SCENE.HOOKED_FISH_DROP);
  drawFishBody(ctx, state.hooked.kind, state.hooked.size, false, images);
  ctx.restore();
}

/** 자동으로 잡은 물고기 옆에 잡은 양(예: +0.0000208)을 띄운다. 매달린 물고기와 함께 사라진다 */
function drawCatchLabel(ctx: CanvasRenderingContext2D, state: SceneState, label: string | null) {
  const opacity = hookedFishOpacity(state);
  if (!label || !state.hooked?.labeled || opacity === 0) return;
  const { x, y } = hookedFishCenter(state, state.hooked.size);
  ctx.save();
  ctx.font = CATCH_LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = CATCH_LABEL_OUTLINE_WIDTH;
  ctx.strokeStyle = PALETTE.catchLabelOutline;
  ctx.fillStyle = PALETTE.catchLabel;
  ctx.globalAlpha = opacity;
  const maxX = state.width - ctx.measureText(label).width - CATCH_LABEL_EDGE_MARGIN;
  const labelX = Math.min(x + state.hooked.size * CATCH_LABEL_GAP, maxX);
  ctx.strokeText(label, labelX, y);
  ctx.fillText(label, labelX, y);
  ctx.restore();
}

function drawSplashes(ctx: CanvasRenderingContext2D, state: SceneState) {
  for (const splash of state.splashes) {
    const t = splash.elapsed / SCENE.SPLASH_DURATION;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = PALETTE.splash;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(splash.x, splash.y, 10 + t * 26, 3 + t * 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** 대기·기쁜 스프라이트를 같은 자리에 겹쳐 그려 표정 전환을 페이드로 잇는다 */
function drawOtter(ctx: CanvasRenderingContext2D, state: SceneState, sprites: SceneSprites) {
  const { x, y, size } = otterLayout(state);
  const blend = happyBlend(state);
  ctx.save();
  if (blend < 1) {
    ctx.globalAlpha = 1 - blend;
    ctx.drawImage(sprites.idle, x, y, size, size);
  }
  if (blend > 0) {
    ctx.globalAlpha = blend;
    ctx.drawImage(sprites.happy, x, y, size, size);
  }
  ctx.restore();
}

/** 장면 한 프레임을 그린다. 좌표는 CSS px 기준 (devicePixelRatio 변환은 호출 측에서 설정) */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  sprites: SceneSprites | null,
  catchLabel: string | null,
) {
  ctx.clearRect(0, 0, state.width, state.height);
  if (sprites) drawBackground(ctx, state, sprites.background);
  else drawFallbackBackground(ctx, state);

  const fishImages = sprites?.fish ?? null;
  for (const fish of state.fish) drawFish(ctx, fish, fish.dir === 1, fishImages);

  if (sprites) {
    const pier = pierLayout(state);
    ctx.drawImage(sprites.pier, pier.x, pier.y, pier.width, pier.height);
    drawOtter(ctx, state, sprites);
    drawHookedFish(ctx, state, sprites.fish);
  }

  // 선착장 기둥과 물고기가 물속에 있어 보이도록 수면 아래를 살짝 덮고, 그 위에 파도를 얹는다
  drawUnderwater(ctx, state);
  if (sprites) drawWaves(ctx, state, sprites.wave);
  drawSplashes(ctx, state);

  if (state.jumping) {
    const { kind, size, fromX, toX } = state.jumping;
    const { x, y } = jumpPosition(state.jumping);
    drawFish(ctx, { kind, x, y, size }, toX > fromX, fishImages);
  }

  if (sprites) drawCatchLabel(ctx, state, catchLabel);
}
