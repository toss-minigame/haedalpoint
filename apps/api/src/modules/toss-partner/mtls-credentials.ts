import { readFileSync } from 'node:fs';

/**
 * mTLS 인증서는 둘 중 한 가지로 받는다.
 * - base64 환경 변수: 파일을 둘 수 없는 배포 환경(Vercel 등). PEM 파일 내용을 base64 로 한 줄로 만든 값
 * - 파일 경로: 로컬 개발
 * 둘 다 있으면 base64 를 쓴다.
 */
export interface MtlsCredentialSettings {
  certBase64?: string;
  keyBase64?: string;
  certPath?: string;
  keyPath?: string;
}

export interface MtlsCredentials {
  cert: Buffer;
  key: Buffer;
}

const PEM_HEADER = '-----BEGIN ';

function decodeBase64(value: string): Buffer {
  return Buffer.from(value.trim(), 'base64');
}

/** PEM 파일(-----BEGIN ...)을 base64 로 바꾼 값인지 확인한다 */
export function isPemBase64(value: string): boolean {
  return decodeBase64(value).toString('utf8').startsWith(PEM_HEADER);
}

function decodePemBase64(name: string, value: string): Buffer {
  if (!isPemBase64(value)) throw new Error(`${name} 가 PEM 파일의 base64 값이 아닙니다`);
  return decodeBase64(value);
}

/** 설정된 인증서를 읽는다. 아무것도 설정되지 않았으면 null */
export function loadMtlsCredentials(settings: MtlsCredentialSettings): MtlsCredentials | null {
  if (settings.certBase64 && settings.keyBase64) {
    return {
      cert: decodePemBase64('TOSS_MTLS_CERT_BASE64', settings.certBase64),
      key: decodePemBase64('TOSS_MTLS_KEY_BASE64', settings.keyBase64),
    };
  }
  if (settings.certPath && settings.keyPath) {
    return { cert: readFileSync(settings.certPath), key: readFileSync(settings.keyPath) };
  }
  return null;
}
