import { plainToInstance } from 'class-transformer';
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

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export const TOSS_PARTNER_API_OFFICIAL_URL = 'https://apps-in-toss-api.toss.im';

const JWT_SECRET_MIN_LENGTH = 32;
const ONE_HOUR_SECONDS = 60 * 60;

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

  @IsString()
  @IsOptional()
  TOSS_MTLS_CERT_PATH?: string;

  @IsString()
  @IsOptional()
  TOSS_MTLS_KEY_PATH?: string;
}

export type Env = EnvironmentVariables;

/** production 에서 가짜 파트너 API 나 인증서 없는 설정으로 뜨지 않게 막는다 */
function productionErrors(env: EnvironmentVariables): string[] {
  if (env.NODE_ENV !== NodeEnv.Production) return [];
  const errors: string[] = [];
  if (env.TOSS_PARTNER_API_BASE_URL !== TOSS_PARTNER_API_OFFICIAL_URL) {
    errors.push(
      `production 에서는 TOSS_PARTNER_API_BASE_URL 이 ${TOSS_PARTNER_API_OFFICIAL_URL} 이어야 합니다`,
    );
  }
  if (!env.TOSS_MTLS_CERT_PATH || !env.TOSS_MTLS_KEY_PATH) {
    errors.push('production 에서는 TOSS_MTLS_CERT_PATH, TOSS_MTLS_KEY_PATH 가 필요합니다');
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
  const policyErrors = productionErrors(validated);
  if (policyErrors.length > 0) {
    throw new Error(policyErrors.join('\n'));
  }
  return validated;
}
