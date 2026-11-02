import { Inject, Injectable } from '@nestjs/common';
import { PARTNER_TRANSPORT, type PartnerTransport } from './toss-partner.transport.js';

export const ANON_KEY_EXCHANGE_PATH = '/api-partner/v1/apps-in-toss/users/anon-key/exchange';

/** 익명 사용자 인증 코드가 유효하지 않음 (만료·재사용·위조) */
export const ANON_AUTH_CODE_INVALID = '4011';

/**
 * 파트너 API 실패. HTTP 200 이어도 resultType 이 SUCCESS 가 아니면 실패다.
 * errorCode 는 문서마다 숫자·문자열 표기가 달라 문자열로 맞춘다.
 */
export class TossPartnerError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: string | null,
    readonly reason: string,
  ) {
    super(`Toss partner API failed (status=${status}, errorCode=${errorCode ?? '-'}): ${reason}`);
    this.name = 'TossPartnerError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFailure(status: number, body: unknown): TossPartnerError {
  if (!isRecord(body)) return new TossPartnerError(status, null, 'JSON 이 아닌 응답');
  const error = body.error;
  // OAuth 형식 실패 ({ "error": "invalid_grant" }) 도 실패로 본다
  if (typeof error === 'string') return new TossPartnerError(status, error, error);
  if (isRecord(error)) {
    const code = error.errorCode;
    return new TossPartnerError(
      status,
      typeof code === 'string' || typeof code === 'number' ? String(code) : null,
      typeof error.reason === 'string' ? error.reason : 'unknown',
    );
  }
  return new TossPartnerError(status, null, `resultType=${String(body.resultType)}`);
}

/** resultType 이 SUCCESS 인 봉투의 success 를 꺼낸다. 그 밖은 모두 TossPartnerError */
function unwrapSuccess(status: number, body: unknown): Record<string, unknown> {
  if (status !== 200 || !isRecord(body) || body.resultType !== 'SUCCESS') {
    throw toFailure(status, body);
  }
  if (!isRecord(body.success)) {
    throw new TossPartnerError(status, null, 'success 필드가 없습니다');
  }
  return body.success;
}

// 앱인토스 파트너 API(mTLS) 호출. 응답 봉투 해석은 이 클래스 안에서만 한다.
@Injectable()
export class TossPartnerClient {
  constructor(@Inject(PARTNER_TRANSPORT) private readonly transport: PartnerTransport) {}

  /** 일회용 인증 코드를 익명 사용자 식별 키(anonKey)로 교환한다 */
  async exchangeAnonAuthCode(code: string): Promise<string> {
    const { status, body } = await this.transport({
      method: 'POST',
      path: ANON_KEY_EXCHANGE_PATH,
      body: { code },
    });
    const { anonKey } = unwrapSuccess(status, body);
    if (typeof anonKey !== 'string' || anonKey.length === 0) {
      throw new TossPartnerError(status, null, 'anonKey 가 없습니다');
    }
    return anonKey;
  }
}
