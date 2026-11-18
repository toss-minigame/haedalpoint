// 퀴즈·룰렛 화면 안내와 홈 콘텐츠 첫 안내를 본 기록 (보상과 무관해서 브라우저 저장소에 둔다. 기기를 바꾸면 한 번 더 볼 수 있다)
const PREFIX = 'haedal.tutorial.seen.';

/** 본 적이 있으면 true. 저장소를 쓸 수 없으면 null (그때는 안내를 띄우지 않는다: 매번 뜨는 쪽보다 낫다) */
export function readSeen(key: string): boolean | null {
  try {
    return window.localStorage.getItem(PREFIX + key) !== null;
  } catch {
    return null;
  }
}

export function markSeen(key: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, '1');
  } catch {
    // 저장하지 못해도 이번에는 닫힌다. 다음에 다시 열면 한 번 더 보일 뿐이다
  }
}
