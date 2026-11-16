import { TossPartnerClient, TossPartnerError } from '../toss-partner.client.js';
import type { PartnerResponse } from '../toss-partner.transport.js';

describe('TossPartnerClient promotion', () => {
  const transport = jest.fn<Promise<PartnerResponse>, [unknown]>();
  const client = new TossPartnerClient(transport);
  const HEADERS = { 'x-anon-key': 'anon-1' };

  beforeEach(() => jest.resetAllMocks());

  function respond(status: number, body: unknown) {
    transport.mockResolvedValue({ status, body });
  }

  describe('getPromotionKey', () => {
    it('asks the documented endpoint with only the x-anon-key header', async () => {
      respond(200, { resultType: 'SUCCESS', success: { key: 'key-1' } });

      await expect(client.getPromotionKey('anon-1')).resolves.toBe('key-1');
      expect(transport).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key',
        headers: HEADERS,
      });
    });

    it('fails without a key', async () => {
      respond(200, { resultType: 'SUCCESS', success: {} });

      await expect(client.getPromotionKey('anon-1')).rejects.toBeInstanceOf(TossPartnerError);
    });
  });

  describe('executePromotion', () => {
    const payment = { anonKey: 'anon-1', promotionCode: 'PROMO', key: 'key-1', amount: 1 };

    it('sends the promotion code, key and amount', async () => {
      respond(200, { resultType: 'SUCCESS', success: { key: 'key-1' } });

      await client.executePromotion(payment);

      expect(transport).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api-partner/v1/apps-in-toss/promotion/execute-promotion',
        headers: HEADERS,
        body: { promotionCode: 'PROMO', key: 'key-1', amount: 1 },
      });
    });

    it('throws the business error code on an HTTP 200 FAIL envelope', async () => {
      respond(200, {
        resultType: 'FAIL',
        error: { errorCode: '4109', reason: '프로모션이 실행중이 아니에요' },
      });

      const error = await client.executePromotion(payment).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TossPartnerError);
      expect((error as TossPartnerError).errorCode).toBe('4109');
    });
  });

  describe('getPromotionResult', () => {
    it.each(['PENDING', 'SUCCESS', 'FAILED'])(
      'returns %s from the success string',
      async (result) => {
        respond(200, { resultType: 'SUCCESS', success: result });

        await expect(client.getPromotionResult('anon-1', 'PROMO', 'key-1')).resolves.toBe(result);
        expect(transport).toHaveBeenCalledWith({
          method: 'POST',
          path: '/api-partner/v1/apps-in-toss/promotion/execution-result',
          headers: HEADERS,
          body: { promotionCode: 'PROMO', key: 'key-1' },
        });
      },
    );

    it('rejects an unknown result', async () => {
      respond(200, { resultType: 'SUCCESS', success: 'DONE' });

      await expect(client.getPromotionResult('anon-1', 'PROMO', 'key-1')).rejects.toBeInstanceOf(
        TossPartnerError,
      );
    });

    it('surfaces 4111 when nothing was paid with the key', async () => {
      respond(200, { resultType: 'FAIL', error: { errorCode: 4111, reason: '지급내역 없음' } });

      const error = await client.getPromotionResult('anon-1', 'PROMO', 'key-1').catch((e) => e);

      expect((error as TossPartnerError).errorCode).toBe('4111');
    });
  });
});
