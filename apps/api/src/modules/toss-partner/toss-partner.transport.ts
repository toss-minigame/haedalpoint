import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';

export interface PartnerRequest {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}

export interface PartnerResponse {
  status: number;
  /** JSON 이 아니면 null */
  body: unknown;
}

/** 파트너 API 한 번 호출. 테스트에서는 가짜 구현으로 바꿔 끼운다 */
export type PartnerTransport = (request: PartnerRequest) => Promise<PartnerResponse>;

export const PARTNER_TRANSPORT = Symbol('PARTNER_TRANSPORT');

export interface PartnerTransportConfig {
  baseUrl: string;
  certPath?: string;
  keyPath?: string;
  timeoutMs: number;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * https 주소면 mTLS 클라이언트 인증서를 실어 호출한다.
 * http 주소는 로컬 가짜 파트너 API 용이며, production 에서는 env 검증이 공식 https 주소만 허용한다.
 * 인증서는 첫 호출 때 읽는다 (인증서가 없는 개발 환경에서도 서버가 뜨도록).
 */
export function createPartnerTransport(config: PartnerTransportConfig): PartnerTransport {
  let mtlsAgent: https.Agent | null = null;

  const getMtlsAgent = (): https.Agent => {
    if (mtlsAgent) return mtlsAgent;
    if (!config.certPath || !config.keyPath) {
      throw new Error('TOSS_MTLS_CERT_PATH, TOSS_MTLS_KEY_PATH 가 설정되지 않았습니다');
    }
    mtlsAgent = new https.Agent({
      cert: readFileSync(config.certPath),
      key: readFileSync(config.keyPath),
      keepAlive: true,
    });
    return mtlsAgent;
  };

  return (request) =>
    new Promise<PartnerResponse>((resolve, reject) => {
      const url = new URL(request.path, config.baseUrl);
      const isHttps = url.protocol === 'https:';
      const payload = request.body === undefined ? undefined : JSON.stringify(request.body);

      let agent: https.Agent | undefined;
      try {
        agent = isHttps ? getMtlsAgent() : undefined;
      } catch (error) {
        reject(error);
        return;
      }

      const req = (isHttps ? https : http).request(
        url,
        {
          method: request.method,
          agent,
          timeout: config.timeoutMs,
          headers: {
            Accept: 'application/json',
            ...(payload && {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              body: parseJson(Buffer.concat(chunks).toString('utf8')),
            }),
          );
          res.on('error', reject);
        },
      );
      req.on('timeout', () => req.destroy(new Error(`파트너 API 응답 시간 초과: ${url.pathname}`)));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
}
