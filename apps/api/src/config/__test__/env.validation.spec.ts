// Nest 없이 class-transformer 를 쓰므로 데코레이터 메타데이터를 직접 로드한다
import 'reflect-metadata';
import { TOSS_PARTNER_API_OFFICIAL_URL, validateEnv } from '../env.validation';

const BASE = {
  DATABASE_URL: 'postgresql://localhost/test',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('defaults the partner API to the official URL', () => {
    expect(validateEnv(BASE).TOSS_PARTNER_API_BASE_URL).toBe(TOSS_PARTNER_API_OFFICIAL_URL);
  });

  it('allows a local fake partner API outside production', () => {
    const env = validateEnv({ ...BASE, TOSS_PARTNER_API_BASE_URL: 'http://localhost:3100' });

    expect(env.TOSS_PARTNER_API_BASE_URL).toBe('http://localhost:3100');
  });

  it('requires a JWT secret of at least 32 characters', () => {
    expect(() => validateEnv({ ...BASE, JWT_SECRET: 'short' })).toThrow('JWT_SECRET');
  });

  describe('production', () => {
    const PROD = {
      ...BASE,
      NODE_ENV: 'production',
      TOSS_MTLS_CERT_PATH: '/certs/a_public.crt',
      TOSS_MTLS_KEY_PATH: '/certs/a_private.key',
    };

    it('accepts the official partner API with certificates', () => {
      expect(() => validateEnv(PROD)).not.toThrow();
    });

    it('refuses to start against a fake partner API', () => {
      expect(() =>
        validateEnv({ ...PROD, TOSS_PARTNER_API_BASE_URL: 'http://localhost:3100' }),
      ).toThrow('TOSS_PARTNER_API_BASE_URL');
    });

    it('refuses to start without mTLS certificate paths', () => {
      expect(() => validateEnv({ ...PROD, TOSS_MTLS_KEY_PATH: undefined })).toThrow(
        'TOSS_MTLS_CERT_PATH',
      );
    });
  });
});
