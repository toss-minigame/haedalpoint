import { SNOW } from './snow-config';
import { createSnowflake, type SnowArea, type Snowflake } from './snowflake';

/** 장면에 내리는 눈송이들. 개수는 장면 크기로 정해지고, 아래로 사라진 눈송이를 위에서 다시 만들어 그대로 유지한다 */
export type Snowfall = readonly Snowflake[];

type Random = () => number;

/** 장면 넓이에 비례하는 눈송이 수 (최대 SNOW.MAX_COUNT) */
export function snowflakeCount(area: SnowArea): number {
  return Math.min(SNOW.MAX_COUNT, Math.round(area.width * area.height * SNOW.DENSITY));
}

/** 장면 전체에 흩뿌린 눈. 처음부터 눈이 내리고 있는 모습이다 */
export function createSnowfall(random: Random, area: SnowArea): Snowfall {
  return Array.from({ length: snowflakeCount(area) }, () =>
    createSnowflake(random, area, 'scattered'),
  );
}

function stepSnowflake(flake: Snowflake, dt: number, random: Random, area: SnowArea): Snowflake {
  if (flake.delay > 0) return { ...flake, delay: Math.max(0, flake.delay - dt) };
  const y = flake.y + flake.speed * dt;
  // 장면 아래로 완전히 사라지면 위에서 새 지름·위치·빠르기로 다시 내린다
  if (y - flake.diameter / 2 > area.height) return createSnowflake(random, area, 'top');
  return { ...flake, y, phase: flake.phase + SNOW.SWAY_SPEED * dt };
}

/** 한 프레임 진행. 원래 눈은 그대로 두고 새 눈을 돌려준다 */
export function stepSnowfall(
  snowfall: Snowfall,
  dt: number,
  random: Random,
  area: SnowArea,
): Snowfall {
  return snowfall.map((flake) => stepSnowflake(flake, dt, random, area));
}
