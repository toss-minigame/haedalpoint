// 서비스의 "하루"(출석·퀴즈 등)는 KST(Asia/Seoul, UTC+9, DST 없음) 00:00 기준.
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

/** `at` 이후 처음 오는 KST 00:00 (정확히 자정이면 다음 날 자정) */
export function nextKstMidnight(at: Date): Date {
  const kstMs = at.getTime() + KST_OFFSET_MS;
  const nextKstDayStart = (Math.floor(kstMs / DAY_MS) + 1) * DAY_MS;
  return new Date(nextKstDayStart - KST_OFFSET_MS);
}

/** 'YYYY-MM-DD' KST 날짜가 시작하는 시각 (그날 KST 00:00) */
export function kstDayStart(date: string): Date {
  return new Date(Date.parse(`${date}T00:00:00Z`) - KST_OFFSET_MS);
}

/** `at` 이 속한 KST 달의 1일 00:00 */
export function kstMonthStart(at: Date): Date {
  const yearMonth = toKstDateString(at).slice(0, 'YYYY-MM'.length);
  return kstDayStart(`${yearMonth}-01`);
}
