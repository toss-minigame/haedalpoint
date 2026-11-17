import { SNOW } from './snow-config';
import type { Snowfall } from './snowfall';
import { snowflakePosition } from './snowflake';

/** 눈송이를 그린다. 흰 원에 옅은 파란 테두리를 둘러 밝은 하늘·눈밭에서도 보이게 한다 */
export function drawSnowfall(ctx: CanvasRenderingContext2D, snowfall: Snowfall) {
  ctx.save();
  ctx.fillStyle = SNOW.COLOR;
  ctx.strokeStyle = SNOW.OUTLINE_COLOR;
  ctx.lineWidth = SNOW.OUTLINE_WIDTH;
  for (const flake of snowfall) {
    const { x, y } = snowflakePosition(flake);
    ctx.globalAlpha = flake.opacity;
    ctx.beginPath();
    ctx.arc(x, y, flake.diameter / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
