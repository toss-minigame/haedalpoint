import { jumpPosition, otterLayout, SCENE, type SceneState, waterLineY } from './scene-state';

export type SceneSprites = {
  idle: HTMLImageElement;
  happy: HTMLImageElement;
};

// 장면 색 토큰 (캔버스는 CSS 변수를 직접 못 쓰므로 여기 한 곳에 모은다)
const PALETTE = {
  skyTop: '#cfe9f8',
  skyBottom: '#f1f9fd',
  waterTop: '#7cc3e2',
  waterBottom: '#2e7aa8',
  waterFront: 'rgba(76, 160, 204, 0.55)', // 해달 하반신을 덮는 앞쪽 수면
  wave: 'rgba(255, 255, 255, 0.85)',
  splash: 'rgba(255, 255, 255, 0.9)',
} as const;

const FISH_EMOJI = '🐟';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const WAVE_AMPLITUDE = 3;
const WAVE_LENGTH = 48;
const WAVE_SPEED = 1.6;

function drawSky(ctx: CanvasRenderingContext2D, width: number, waterY: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, waterY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, waterY);
}

function wavePath(ctx: CanvasRenderingContext2D, width: number, waterY: number, time: number) {
  ctx.beginPath();
  for (let x = 0; x <= width; x += 4) {
    const y = waterY + Math.sin(x / WAVE_LENGTH + time * WAVE_SPEED) * WAVE_AMPLITUDE;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  { width, height, time }: SceneState,
  fill: string | CanvasGradient,
) {
  const waterY = waterLineY(height);
  wavePath(ctx, width, waterY, time);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawWaveLine(ctx: CanvasRenderingContext2D, { width, height, time }: SceneState) {
  wavePath(ctx, width, waterLineY(height), time);
  ctx.strokeStyle = PALETTE.wave;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawFishEmoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  facingRight: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  // 🐟 이모지는 왼쪽을 바라보므로 오른쪽으로 갈 때 좌우 반전
  if (facingRight) ctx.scale(-1, 1);
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(FISH_EMOJI, 0, 0);
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

/** 장면 한 프레임을 그린다. 좌표는 CSS px 기준 (devicePixelRatio 변환은 호출 측에서 설정) */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: SceneState,
  sprites: SceneSprites | null,
) {
  const { width, height, time } = state;
  const waterY = waterLineY(height);
  ctx.clearRect(0, 0, width, height);

  drawSky(ctx, width, waterY);
  const water = ctx.createLinearGradient(0, waterY, 0, height);
  water.addColorStop(0, PALETTE.waterTop);
  water.addColorStop(1, PALETTE.waterBottom);
  drawWater(ctx, state, water);

  for (const fish of state.fish) drawFishEmoji(ctx, fish.x, fish.y, fish.size, fish.dir === 1);

  if (sprites) {
    const otter = otterLayout(state);
    const sprite = time < state.happyUntil ? sprites.happy : sprites.idle;
    ctx.drawImage(sprite, otter.x, otter.y, otter.size, otter.size);
  }

  // 해달 하반신이 물에 잠겨 보이도록 앞쪽 수면을 반투명하게 한 번 더 덮는다
  drawWater(ctx, state, PALETTE.waterFront);
  drawWaveLine(ctx, state);
  drawSplashes(ctx, state);

  if (state.jumping) {
    const { x, y } = jumpPosition(state.jumping);
    drawFishEmoji(ctx, x, y, state.jumping.size, state.jumping.toX > state.jumping.fromX);
  }
}
