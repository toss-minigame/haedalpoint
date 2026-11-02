import { env } from '@/shared/config/env';
import { readApiData } from './api-response';
import { discardAccessToken, getAccessToken } from './auth-token';

const HTTP_UNAUTHORIZED = 401;

async function send(path: string, init: RequestInit | undefined, token: string) {
  return fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    credentials: 'include',
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  let res = await send(path, init, token);
  // 토큰이 만료됐으면 한 번만 새로 발급받아 다시 보낸다 (사용자에게 보이는 로그인 화면 없음)
  if (res.status === HTTP_UNAUTHORIZED) {
    discardAccessToken(token);
    res = await send(path, init, await getAccessToken());
  }
  return readApiData<T>(res);
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
