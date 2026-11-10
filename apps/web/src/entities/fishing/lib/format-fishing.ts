/** 화면에 보여주는 소수 자릿수 */
const FISH_FRACTION_DIGITS = 7;
const FISH_SCALE = 10 ** FISH_FRACTION_DIGITS;
/** 서버 수량(1/10억 마리 단위)을 나눌 때 생기는 부동소수 오차가 자릿수를 내리지 않게 더하는 값 */
const FLOAT_EPSILON = 1e-6;

const fishFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: FISH_FRACTION_DIGITS,
  maximumFractionDigits: FISH_FRACTION_DIGITS,
});

/** 물고기 수는 소수 7자리까지 내림해서 보여준다 (예: 0.1234567) */
export function formatFish(fish: number): string {
  return fishFormatter.format(Math.floor(fish * FISH_SCALE + FLOAT_EPSILON) / FISH_SCALE);
}
