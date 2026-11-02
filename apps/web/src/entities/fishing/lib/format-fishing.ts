const fishFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

/** 물고기 수는 정수로 내림해서 보여준다 (소수점은 서버가 이어서 센다) */
export function formatFish(fish: number): string {
  return fishFormatter.format(Math.floor(fish));
}
