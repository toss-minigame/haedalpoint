const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' 를 1970-01-01 기준 일 수로 변환 */
function toDayIndex(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

/**
 * 오늘의 퀴즈 선택: 모든 사용자에게 같은 문제를 낸다.
 * 정렬된 활성 퀴즈 목록을 날짜마다 `count` 칸씩 순환하며 연속된 `count` 개를 고른다.
 * 같은 날짜 → 항상 같은 결과 (DB 에 "오늘의 세트"를 따로 저장하지 않아도 됨).
 *
 * @param date KST 'YYYY-MM-DD'
 * @param activeQuizIds 출제 대상 퀴즈 id (호출 측에서 안정적인 순서로 정렬해서 전달)
 * @param count 하루 퀴즈 수
 */
export function selectDailyQuizIds(
  date: string,
  activeQuizIds: readonly string[],
  count: number,
): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`Invalid daily quiz count: ${count}`);
  }

  const total = activeQuizIds.length;
  if (total <= count) return [...activeQuizIds];

  const start = (toDayIndex(date) * count) % total;
  return Array.from({ length: count }, (_, i) => activeQuizIds[(start + i) % total]);
}
