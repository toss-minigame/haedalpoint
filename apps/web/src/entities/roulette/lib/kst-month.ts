const kstMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  month: 'numeric',
});

/** 지금 KST 월 (1~12). 서버 응답 전에 버튼 문구를 그릴 때 쓴다 */
export function currentKstMonth(now: Date = new Date()): number {
  return Number(kstMonthFormatter.format(now));
}
