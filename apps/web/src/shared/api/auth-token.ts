// 사용자 인증 (ADR-0006): 토스가 발급한 일회용 코드를 서버에 보내 자체 access token 을 받는다.
// 로그인 화면은 없다. 토큰은 메모리에만 두고, 앱을 다시 열거나 만료되면 새로 발급받는다.
import { User } from '@apps-in-toss/web-framework';
import type { AnonLoginRequest, AuthTokenResponse } from '@haedalpoint/shared';
import { env } from '@/shared/config/env';
import { readApiData } from './api-response';

let accessToken: string | null = null;
let pendingIssue: Promise<string> | null = null;

async function issueAccessToken(): Promise<string> {
  // 코드는 300초 동안 한 번만 쓸 수 있으므로 저장하지 않고 바로 보낸다
  const { code } = await User.createAnonymousKeyAuthCode();
  const body: AnonLoginRequest = { code };
  const res = await fetch(`${env.apiBaseUrl}/auth/anon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const token = await readApiData<AuthTokenResponse>(res);
  accessToken = token.accessToken;
  return accessToken;
}

/** 발급된 토큰을 돌려준다. 동시에 여러 요청이 와도 발급은 한 번만 한다 */
export function getAccessToken(): Promise<string> {
  if (accessToken) return Promise.resolve(accessToken);
  pendingIssue ??= issueAccessToken().finally(() => {
    pendingIssue = null;
  });
  return pendingIssue;
}

/** 401 을 받은 토큰을 버린다. 그사이 다른 요청이 새로 발급받았다면 그 토큰은 유지한다 */
export function discardAccessToken(rejected: string): void {
  if (accessToken === rejected) accessToken = null;
}
