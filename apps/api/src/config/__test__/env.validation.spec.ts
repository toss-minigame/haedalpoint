// Nest 없이 class-transformer 를 쓰므로 데코레이터 메타데이터를 직접 로드한다
import 'reflect-metadata';
import { TOSS_PARTNER_API_OFFICIAL_URL, validateEnv } from '../env.validation.js';

const BASE = {
  DATABASE_URL: 'postgresql://localhost/test',
  JWT_SECRET: 'x'.repeat(32),
};

// 테스트용 가짜 PEM (실제 인증서 아님)
const toBase64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const FAKE_CERT_B64 = toBase64('-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n');
const FAKE_KEY_B64 = toBase64('-----BEGIN PRIVATE KEY-----\nBBBB\n-----END PRIVATE KEY-----\n');

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

  describe('DB_SSL', () => {
    it.each([
      ['false', false],
      ['FALSE', false],
      ['0', false],
      ['true', true],
      ['1', true],
    ])('reads %p as %p', (raw, expected) => {
      expect(validateEnv({ ...BASE, DB_SSL: raw }).DB_SSL).toBe(expected);
    });

    it('defaults to true when missing or empty', () => {
      expect(validateEnv(BASE).DB_SSL).toBe(true);
      expect(validateEnv({ ...BASE, DB_SSL: '' }).DB_SSL).toBe(true);
    });

    it('rejects an unknown value', () => {
      expect(() => validateEnv({ ...BASE, DB_SSL: 'yes' })).toThrow('DB_SSL');
    });
  });

  describe('mTLS certificate settings', () => {
    it('accepts a base64 pair of PEM files', () => {
      const env = validateEnv({
        ...BASE,
        TOSS_MTLS_CERT_BASE64: FAKE_CERT_B64,
        TOSS_MTLS_KEY_BASE64: FAKE_KEY_B64,
      });

      expect(env.TOSS_MTLS_CERT_BASE64).toBe(FAKE_CERT_B64);
    });

    it('rejects only one of the base64 pair', () => {
      expect(() => validateEnv({ ...BASE, TOSS_MTLS_CERT_BASE64: FAKE_CERT_B64 })).toThrow(
        'TOSS_MTLS_KEY_BASE64',
      );
    });

    it('rejects only one of the path pair', () => {
      expect(() => validateEnv({ ...BASE, TOSS_MTLS_CERT_PATH: '/certs/a_public.crt' })).toThrow(
        'TOSS_MTLS_KEY_PATH',
      );
    });

    it('rejects a base64 value that is not a PEM file (e.g. raw file pasted without encoding)', () => {
      expect(() =>
        validateEnv({
          ...BASE,
          TOSS_MTLS_CERT_BASE64: toBase64('not a certificate'),
          TOSS_MTLS_KEY_BASE64: FAKE_KEY_B64,
        }),
      ).toThrow('TOSS_MTLS_CERT_BASE64 가 PEM 파일의 base64 값이 아닙니다');
    });
  });

  describe('production', () => {
    const PROD = {
      ...BASE,
      NODE_ENV: 'production',
      TOSS_MTLS_CERT_PATH: '/certs/a_public.crt',
      TOSS_MTLS_KEY_PATH: '/certs/a_private.key',
    };

    it('accepts the official partner API with certificate paths', () => {
      expect(() => validateEnv(PROD)).not.toThrow();
    });

    it('accepts the official partner API with base64 certificates (e.g. Vercel)', () => {
      expect(() =>
        validateEnv({
          ...BASE,
          NODE_ENV: 'production',
          TOSS_MTLS_CERT_BASE64: FAKE_CERT_B64,
          TOSS_MTLS_KEY_BASE64: FAKE_KEY_B64,
        }),
      ).not.toThrow();
    });

    it('refuses to start against a fake partner API', () => {
      expect(() =>
        validateEnv({ ...PROD, TOSS_PARTNER_API_BASE_URL: 'http://localhost:3100' }),
      ).toThrow('TOSS_PARTNER_API_BASE_URL');
    });

    it('refuses to start without any mTLS certificate', () => {
      expect(() => validateEnv({ ...BASE, NODE_ENV: 'production' })).toThrow(
        'production 에서는 mTLS 인증서가 필요합니다',
      );
    });
  });
});
