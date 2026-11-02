import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { isPemBase64 } from '../modules/toss-partner/mtls-credentials.js';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export const TOSS_PARTNER_API_OFFICIAL_URL = 'https://apps-in-toss-api.toss.im';

const JWT_SECRET_MIN_LENGTH = 32;
const ONE_HOUR_SECONDS = 60 * 60;

const BOOLEAN_STRINGS: Readonly<Record<string, boolean>> = {
  true: true,
  '1': true,
  false: false,
  '0': false,
};

/**
 * 환경 변수 문자열을 boolean 으로 읽는다. 비어 있으면 fallback.
 * enableImplicitConversion 은 'false' 를 Boolean('false') = true 로 바꾸므로 원래 값을 직접 판정한다.
 * 알 수 없는 값은 그대로 돌려줘 @IsBoolean 검증에서 걸리게 한다.
 */
function parseBooleanEnv(raw: unknown, fallback: boolean): unknown {
  if (raw === undefined || raw === '') return fallback;
  if (typeof raw === 'boolean') return raw;
  return BOOLEAN_STRINGS[String(raw).trim().toLowerCase()] ?? raw;
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsNumber()
  PORT: number = 3000;

  // 쉼표로 여러 origin 지정 (예: 앱인토스 실서비스·QR 테스트 origin)
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  DATABASE_URL: string;

  @Transform(({ obj }) => parseBooleanEnv((obj as Record<string, unknown>).DB_SSL, true))
  @IsBoolean()
  DB_SSL: boolean = true;

  // 자체 access token(JWT, HS256) 서명 키
  @IsString()
  @MinLength(JWT_SECRET_MIN_LENGTH)
  JWT_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS: number = ONE_HOUR_SECONDS;

  // 로컬 개발에서는 가짜 파트너 API(scripts/fake-toss-partner.mjs) 주소로 바꿔 쓴다
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  TOSS_PARTNER_API_BASE_URL: string = TOSS_PARTNER_API_OFFICIAL_URL;

  // mTLS 인증서: base64 한 쌍(파일을 둘 수 없는 배포 환경) 또는 파일 경로 한 쌍(로컬)
  @IsString()
  @IsOptional()
  TOSS_MTLS_CERT_BASE64?: string;

  @IsString()
  @IsOptional()
  TOSS_MTLS_KEY_BASE64?: string;

  @IsString()
  @IsOptional()
  TOSS_MTLS_CERT_PATH?: string;

  @IsString()
  @IsOptional()
  TOSS_MTLS_KEY_PATH?: string;
}

export type Env = EnvironmentVariables;

function hasPair(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a && b);
}

function mtlsErrors(env: EnvironmentVariables): string[] {
  const errors: string[] = [];
  const { TOSS_MTLS_CERT_BASE64: certB64, TOSS_MTLS_KEY_BASE64: keyB64 } = env;
  const { TOSS_MTLS_CERT_PATH: certPath, TOSS_MTLS_KEY_PATH: keyPath } = env;

  if (Boolean(certB64) !== Boolean(keyB64)) {
    errors.push('TOSS_MTLS_CERT_BASE64 와 TOSS_MTLS_KEY_BASE64 는 함께 설정해야 합니다');
  }
  if (Boolean(certPath) !== Boolean(keyPath)) {
    errors.push('TOSS_MTLS_CERT_PATH 와 TOSS_MTLS_KEY_PATH 는 함께 설정해야 합니다');
  }
  for (const [name, value] of [
    ['TOSS_MTLS_CERT_BASE64', certB64],
    ['TOSS_MTLS_KEY_BASE64', keyB64],
  ] as const) {
    if (value && !isPemBase64(value)) errors.push(`${name} 가 PEM 파일의 base64 값이 아닙니다`);
  }
  return errors;
}

/** production 에서 가짜 파트너 API 나 인증서 없는 설정으로 뜨지 않게 막는다 */
function productionErrors(env: EnvironmentVariables): string[] {
  if (env.NODE_ENV !== NodeEnv.Production) return [];
  const errors: string[] = [];
  if (env.TOSS_PARTNER_API_BASE_URL !== TOSS_PARTNER_API_OFFICIAL_URL) {
    errors.push(
      `production 에서는 TOSS_PARTNER_API_BASE_URL 이 ${TOSS_PARTNER_API_OFFICIAL_URL} 이어야 합니다`,
    );
  }
  const hasBase64 = hasPair(env.TOSS_MTLS_CERT_BASE64, env.TOSS_MTLS_KEY_BASE64);
  const hasPaths = hasPair(env.TOSS_MTLS_CERT_PATH, env.TOSS_MTLS_KEY_PATH);
  if (!hasBase64 && !hasPaths) {
    errors.push(
      'production 에서는 mTLS 인증서가 필요합니다 (TOSS_MTLS_CERT_BASE64·TOSS_MTLS_KEY_BASE64 또는 TOSS_MTLS_CERT_PATH·TOSS_MTLS_KEY_PATH)',
    );
  }
  return errors;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  const policyErrors = [...mtlsErrors(validated), ...productionErrors(validated)];
  if (policyErrors.length > 0) {
    throw new Error(policyErrors.join('\n'));
  }
  return validated;
}
