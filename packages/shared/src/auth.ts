// 사용자 인증 API 타입 (FE/BE 공용) — ADR-0006

// POST /api/auth/anon
export interface AnonLoginRequest {
  // User.createAnonymousKeyAuthCode() 로 받은 일회용 코드 (300초 안에 한 번만 사용)
  code: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number; // 초
}
