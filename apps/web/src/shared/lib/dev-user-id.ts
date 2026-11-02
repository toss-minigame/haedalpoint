// 임시 사용자 식별: 토스 로그인 연동 전까지 localStorage 의 userId 를 X-User-Id 헤더로 보낸다.
// 토스 로그인 붙이면 이 파일과 http-client 의 헤더 주입부를 함께 교체한다.
const STORAGE_KEY = 'haedalpoint:userId';

export function getDevUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDevUserId(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(STORAGE_KEY, userId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소 접근이 막힌 환경(사생활 보호 모드 등)에서는 무시
  }
}
