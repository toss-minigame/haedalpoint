// 서비스의 하루는 KST 기준이라 기기 시간대와 상관없이 KST로 보여준다
const entryTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 창고 이력 시각 (예: 11월 5일 14:20) */
export function formatEntryTime(iso: string): string {
  return entryTimeFormatter.format(new Date(iso));
}
