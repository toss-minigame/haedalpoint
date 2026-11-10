import {
  getOperationalEnvironment,
  getPlatformOS,
  getTossAppVersion,
} from '@apps-in-toss/web-framework';
import { version as aitSdkVersion } from '@apps-in-toss/web-framework/package.json';

// ── 임시 진단 로그 (debug/ad-log-detail). 광고 불러오기 실패(1017) 원인을 찾으면 지운다 ──
// 토스 앱 안에서는 콘솔을 볼 수 없으므로 줄을 메모리에 쌓고, 화면의 '광고 로그' 창(AdDebugPanel)이 보여준다.

const LOG_PREFIX = '[광고]';
const MAX_LINES = 300;
const startedAt = performance.now();

let lines: readonly string[] = [];
const listeners = new Set<() => void>();

/** Error 처럼 속성이 숨어 있는 객체도 모든 자기 속성을 펼쳐 문자열로 만든다 */
export function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, current: unknown) => {
      if (current === undefined) return '(undefined)';
      if (typeof current === 'function') return `(function ${current.name})`;
      if (current && typeof current === 'object') {
        if (seen.has(current)) return '(순환 참조)';
        seen.add(current);
        if (current instanceof Error) return describeError(current);
      }
      return current;
    });
  } catch (error) {
    return `(문자열로 바꾸지 못함: ${String(error)})`;
  }
}

/** SDK 가 돌려준 오류의 모든 정보 (종류·생성자·문자열·자기 속성 전부) */
export function describeError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return { type: typeof error, value: error };
  const props: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(error)) {
    props[key] = Reflect.get(error, key);
  }
  return {
    type: Object.prototype.toString.call(error),
    constructor: (error as { constructor?: { name?: string } }).constructor?.name,
    string: String(error),
    props,
  };
}

/** 광고 그룹 ID 에 눈에 안 보이는 공백·줄바꿈·따옴표·비ASCII 문자가 섞였는지 */
export function inspectAdGroupId(adGroupId: string | null): Record<string, unknown> {
  if (adGroupId === null) return { value: null };
  return {
    quoted: JSON.stringify(adGroupId),
    length: adGroupId.length,
    trimmedLength: adGroupId.trim().length,
    hasWhitespace: /\s/.test(adGroupId),
    hasQuote: /["'`]/.test(adGroupId),
    nonAscii: [...adGroupId]
      .filter((char) => (char.codePointAt(0) ?? 0) > 127)
      .map((char) => `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase()}`),
  };
}

function safeCall(read: () => unknown): unknown {
  try {
    return read();
  } catch (error) {
    return `(호출 실패: ${String(error)})`;
  }
}

/** 실행 환경: SDK·토스 앱 버전, OS, toss/sandbox, 빌드 모드 */
export function adEnvironment(): Record<string, unknown> {
  return {
    sdkVersion: aitSdkVersion,
    buildMode: import.meta.env.MODE,
    platformOS: safeCall(getPlatformOS),
    tossAppVersion: safeCall(getTossAppVersion),
    operationalEnvironment: safeCall(getOperationalEnvironment),
    userAgent: navigator.userAgent,
  };
}

/** 한 줄 기록: 시각, 앱을 연 뒤 지난 ms, 단계, 내용 */
export function adLog(stage: string, data?: unknown): void {
  const elapsedMs = Math.round(performance.now() - startedAt);
  const time = new Date().toISOString().slice(11, 23);
  const body = data === undefined ? '' : ` ${safeStringify(data)}`;
  const line = `${time} +${elapsedMs}ms ${stage}${body}`;
  console.info(LOG_PREFIX, line);
  lines = [...lines, line].slice(-MAX_LINES);
  for (const listener of listeners) listener();
}

export function subscribeAdLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAdLogLines(): readonly string[] {
  return lines;
}
