// 장면에 내리는 눈의 수치. 값만 둔다 (눈송이 만들기는 snowflake, 떨어뜨리기는 snowfall, 그리기는 snow-render).
export const SNOW = {
  /** 장면 넓이 1px² 당 눈송이 수. 390×600 장면이면 40개쯤 */
  DENSITY: 1 / 6000,
  /** 넓은 화면에서도 이보다 많이 그리지 않는다 */
  MAX_COUNT: 60,
  MIN_DIAMETER: 3, // px
  MAX_DIAMETER: 7, // px
  /** 떨어지는 빠르기. 큰 눈송이일수록 빠르다 (가까운 눈처럼 보이게) */
  MIN_SPEED: 25, // px/s
  MAX_SPEED: 70, // px/s
  /** 좌우로 살랑이는 폭 */
  MIN_SWAY: 4, // px
  MAX_SWAY: 12, // px
  /** 좌우로 살랑이는 빠르기 */
  SWAY_SPEED: 1.2, // rad/s
  /** 아래로 사라진 눈송이가 위에서 다시 내리기까지 기다리는 최대 시간 */
  MAX_RESPAWN_DELAY: 2, // s
  /** 작은 눈송이일수록 옅다 */
  MIN_OPACITY: 0.5,
  MAX_OPACITY: 0.95,
  COLOR: '#ffffff',
  /** 하늘·눈밭이 모두 밝아 흰 눈송이만으로는 묻히므로 옅은 파란 테두리를 두른다 */
  OUTLINE_COLOR: 'rgb(120 160 210 / 0.45)',
  OUTLINE_WIDTH: 0.75, // px
} as const;
