import type { ApiErrorResponse, ApiResponse } from '@haedalpoint/shared';
import { env } from '@/shared/config/env';

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | ApiErrorResponse | null;
  if (!res.ok || !body?.success) {
    throw new ApiError(res.status, (body as ApiErrorResponse | null)?.message ?? res.statusText);
  }
  return body.data;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
