// 출석 "하루" 는 KST(Asia/Seoul, UTC+9, DST 없음) 00:00 기준.
// 서버/DB 타임존에 의존하지 않도록 UTC epoch 에 오프셋을 더해 계산한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

/** 주어진 시각의 KST 날짜 ('YYYY-MM-DD') */
export function toKstDateString(at: Date): string {
  return new Date(at.getTime() + KST_OFFSET_MS).toISOString().slice(0, ISO_DATE_LENGTH);
}

/** 'YYYY-MM-DD' 날짜에 일 수를 더한 날짜 (음수면 과거) */
export function addDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  return new Date(base + days * DAY_MS).toISOString().slice(0, ISO_DATE_LENGTH);
}
