import { SNOW } from './snow-config';

/** 눈송이 하나. 지름·위치·빠르기·흔들림·나타나는 시각을 만들 때 랜덤으로 정한다 */
export type Snowflake = {
  /** 흔들리기 전 가로 위치 (중심) */
  x: number;
  /** 세로 위치 (중심) */
  y: number;
  diameter: number;
  /** 떨어지는 빠르기 (px/s) */
  speed: number;
  /** 좌우로 살랑이는 폭 (px) */
  sway: number;
  /** 살랑임의 지금 각도 (rad) */
  phase: number;
  opacity: number;
  /** 다시 내리기 시작할 때까지 남은 시간 (s). 0 이면 떨어지는 중 */
  delay: number;
};

export type SnowArea = { width: number; height: number };

/**
 * scattered: 장면 어디에나 흩뿌려 바로 떨어진다 (처음 장면이 이미 눈 내리는 모습이게)
 * top: 장면 위 바로 바깥에서 랜덤으로 기다렸다가 내린다 (아래로 사라진 눈송이를 다시 만들 때)
 */
export type SnowflakePlacement = 'scattered' | 'top';

type Random = () => number;

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export function createSnowflake(
  random: Random,
  area: SnowArea,
  placement: SnowflakePlacement,
): Snowflake {
  // 지름 하나로 크기·빠르기·옅기를 함께 정해, 작은 눈송이는 멀리서 천천히 옅게 내린다
  const size = random();
  const diameter = lerp(SNOW.MIN_DIAMETER, SNOW.MAX_DIAMETER, size);
  const scattered = placement === 'scattered';
  return {
    x: random() * area.width,
    y: scattered ? random() * area.height : -diameter / 2,
    diameter,
    speed: lerp(SNOW.MIN_SPEED, SNOW.MAX_SPEED, size),
    sway: lerp(SNOW.MIN_SWAY, SNOW.MAX_SWAY, random()),
    phase: random() * 2 * Math.PI,
    opacity: lerp(SNOW.MIN_OPACITY, SNOW.MAX_OPACITY, size),
    delay: scattered ? 0 : random() * SNOW.MAX_RESPAWN_DELAY,
  };
}

/** 지금 그릴 위치 (좌우 살랑임을 더한 중심) */
export function snowflakePosition(flake: Snowflake): { x: number; y: number } {
  return { x: flake.x + Math.sin(flake.phase) * flake.sway, y: flake.y };
}
