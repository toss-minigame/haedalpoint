import type { ApiErrorResponse, ApiResponse } from '@haedalpoint/shared';

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/** 서버 응답 envelope({ success, data })에서 data 를 꺼낸다. 실패면 ApiError */
export async function readApiData<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | ApiErrorResponse | null;
  if (!res.ok || !body?.success) {
    throw new ApiError(res.status, (body as ApiErrorResponse | null)?.message ?? res.statusText);
  }
  return body.data;
}
