/**
 * 서버 수량(1/1000 마리 단위)이나 속도로 계산한 값의 부동소수 오차가 한 마리를 내리지 않게 더하는 값.
 * 서버 최소 단위(0.001)보다 충분히 작다
 */
const FLOAT_EPSILON = 1e-6;

const fishFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

/** 물고기 수는 정수로 내림하고 천 단위 쉼표를 붙여 보여준다 (예: 12,345) */
export function formatFish(fish: number): string {
  return fishFormatter.format(Math.floor(fish + FLOAT_EPSILON));
}
