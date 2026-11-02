import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPemBase64, loadMtlsCredentials } from '../mtls-credentials';

// 테스트용 가짜 PEM (실제 인증서 아님)
const CERT_PEM = '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n';
const KEY_PEM = '-----BEGIN PRIVATE KEY-----\nBBBB\n-----END PRIVATE KEY-----\n';
const toBase64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');

describe('isPemBase64', () => {
  it('accepts base64 of a PEM file', () => {
    expect(isPemBase64(toBase64(CERT_PEM))).toBe(true);
  });

  it('tolerates surrounding whitespace from copy and paste', () => {
    expect(isPemBase64(`  ${toBase64(CERT_PEM)}\n`)).toBe(true);
  });

  it('rejects a raw PEM pasted without base64 encoding', () => {
    expect(isPemBase64(CERT_PEM)).toBe(false);
  });
});

describe('loadMtlsCredentials', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mtls-test-'));
    writeFileSync(join(dir, 'a_public.crt'), CERT_PEM);
    writeFileSync(join(dir, 'a_private.key'), KEY_PEM);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('decodes the base64 pair', () => {
    const credentials = loadMtlsCredentials({
      certBase64: toBase64(CERT_PEM),
      keyBase64: toBase64(KEY_PEM),
    });

    expect(credentials?.cert.toString()).toBe(CERT_PEM);
    expect(credentials?.key.toString()).toBe(KEY_PEM);
  });

  it('reads the file pair', () => {
    const credentials = loadMtlsCredentials({
      certPath: join(dir, 'a_public.crt'),
      keyPath: join(dir, 'a_private.key'),
    });

    expect(credentials?.cert.toString()).toBe(CERT_PEM);
    expect(credentials?.key.toString()).toBe(KEY_PEM);
  });

  it('prefers base64 over file paths when both are set', () => {
    const credentials = loadMtlsCredentials({
      certBase64: toBase64(CERT_PEM),
      keyBase64: toBase64(KEY_PEM),
      certPath: '/does/not/exist.crt',
      keyPath: '/does/not/exist.key',
    });

    expect(credentials?.cert.toString()).toBe(CERT_PEM);
  });

  it('returns null when nothing is configured', () => {
    expect(loadMtlsCredentials({})).toBeNull();
  });

  it('throws when a base64 value is not a PEM file', () => {
    expect(() =>
      loadMtlsCredentials({ certBase64: toBase64('nope'), keyBase64: toBase64(KEY_PEM) }),
    ).toThrow('TOSS_MTLS_CERT_BASE64');
  });
});
