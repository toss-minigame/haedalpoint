import {
  ANON_KEY_EXCHANGE_PATH,
  TossPartnerClient,
  TossPartnerError,
} from '../toss-partner.client';
import type { PartnerResponse } from '../toss-partner.transport';

describe('TossPartnerClient.exchangeAnonAuthCode', () => {
  const transport = jest.fn<Promise<PartnerResponse>, [unknown]>();
  const client = new TossPartnerClient(transport);

  beforeEach(() => jest.resetAllMocks());

  function respond(status: number, body: unknown) {
    transport.mockResolvedValue({ status, body });
  }

  async function failure(): Promise<TossPartnerError> {
    const error = await client.exchangeAnonAuthCode('code-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TossPartnerError);
    return error as TossPartnerError;
  }

  it('sends the code to the documented exchange endpoint', async () => {
    respond(200, { resultType: 'SUCCESS', success: { anonKey: 'anon-1' } });

    await client.exchangeAnonAuthCode('code-1');

    expect(transport).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api-partner/v1/apps-in-toss/users/anon-key/exchange',
      body: { code: 'code-1' },
    });
    expect(ANON_KEY_EXCHANGE_PATH).toBe('/api-partner/v1/apps-in-toss/users/anon-key/exchange');
  });

  it('returns success.anonKey when resultType is SUCCESS', async () => {
    respond(200, { resultType: 'SUCCESS', success: { anonKey: 'anon-1' } });

    await expect(client.exchangeAnonAuthCode('code-1')).resolves.toBe('anon-1');
  });

  it('rejects a FAIL envelope even with HTTP 200 and keeps the error code', async () => {
    respond(200, {
      resultType: 'FAIL',
      error: { errorCode: '4011', reason: '익명 사용자 인증 코드가 유효하지 않아요.' },
    });

    const error = await failure();
    expect(error.errorCode).toBe('4011');
    expect(error.reason).toBe('익명 사용자 인증 코드가 유효하지 않아요.');
  });

  it('normalizes a numeric errorCode to a string', async () => {
    respond(200, { resultType: 'FAIL', error: { errorCode: 4011, reason: 'invalid' } });

    expect((await failure()).errorCode).toBe('4011');
  });

  it('rejects an OAuth-style error body', async () => {
    respond(400, { error: 'invalid_grant' });

    expect((await failure()).errorCode).toBe('invalid_grant');
  });

  it('rejects a non-JSON or non-200 response', async () => {
    respond(500, null);

    expect((await failure()).status).toBe(500);
  });

  it('rejects SUCCESS without an anonKey', async () => {
    respond(200, { resultType: 'SUCCESS', success: {} });

    await failure();
  });

  it('propagates transport errors (TLS, timeout)', async () => {
    transport.mockRejectedValue(new Error('socket hang up'));

    await expect(client.exchangeAnonAuthCode('code-1')).rejects.toThrow('socket hang up');
  });
});
