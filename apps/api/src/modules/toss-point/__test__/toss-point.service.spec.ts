import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { EntityManager } from 'typeorm';
import { TossPartnerClient, TossPartnerError } from '../../toss-partner/toss-partner.client.js';
import { UsersService } from '../../users/users.service.js';
import { TossPointRepository } from '../toss-point.repository.js';
import { MAX_GRANT_ATTEMPTS, TossPointService } from '../toss-point.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-11-16T03:00:00Z');
const PROMO = 'PROMO-ATTENDANCE';

function grant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grant-1',
    userId: USER_ID,
    source: 'ATTENDANCE',
    sourceId: 'log-1',
    amount: 1,
    status: 'PENDING',
    rewardKey: null,
    lastError: null,
    attempts: 0,
    ...overrides,
  };
}

describe('TossPointService', () => {
  let service: TossPointService;
  const repo = {
    create: jest.fn(),
    findPendingByUserId: jest.fn(),
    claim: jest.fn(),
    update: jest.fn(),
  };
  const client = {
    getPromotionKey: jest.fn(),
    executePromotion: jest.fn(),
    getPromotionResult: jest.fn(),
  };
  const usersService = { findById: jest.fn() };
  const config = { get: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    usersService.findById.mockResolvedValue({ id: USER_ID, anonKey: 'anon-1' });
    config.get.mockReturnValue(PROMO);
    repo.claim.mockResolvedValue(grant());
    client.getPromotionKey.mockResolvedValue('key-1');
    client.getPromotionResult.mockResolvedValue('SUCCESS');

    const moduleRef = await Test.createTestingModule({
      providers: [
        TossPointService,
        { provide: TossPointRepository, useValue: repo },
        { provide: TossPartnerClient, useValue: client },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(TossPointService);
  });

  it('creates the grant inside the caller transaction', async () => {
    const manager = { name: 'tx' } as unknown as EntityManager;
    const data = { userId: USER_ID, source: 'ATTENDANCE' as const, sourceId: 'log-1', amount: 1 };
    repo.create.mockResolvedValue({ id: 'grant-1', ...data });

    await service.createGrant(manager, data);

    expect(repo.create).toHaveBeenCalledWith(manager, data);
  });

  describe('settle', () => {
    it('claims the grant for a minute before calling the partner API', async () => {
      await service.settle('grant-1', NOW);

      expect(repo.claim).toHaveBeenCalledWith('grant-1', NOW, new Date(NOW.getTime() + 60_000));
    });

    it('gets a key, saves it before paying, pays and confirms', async () => {
      const calls: string[] = [];
      repo.update.mockImplementation(async (_id, changes) => {
        if ('rewardKey' in changes) calls.push('save-key');
      });
      client.executePromotion.mockImplementation(async () => {
        calls.push('execute');
      });

      await expect(service.settle('grant-1', NOW)).resolves.toBe('SUCCESS');

      expect(calls).toEqual(['save-key', 'execute']);
      expect(client.executePromotion).toHaveBeenCalledWith({
        anonKey: 'anon-1',
        promotionCode: PROMO,
        key: 'key-1',
        amount: 1,
      });
      expect(repo.update).toHaveBeenLastCalledWith(
        'grant-1',
        expect.objectContaining({ status: 'SUCCESS', lastError: null }),
      );
    });

    it('stays PENDING while the payment is still processing', async () => {
      client.getPromotionResult.mockResolvedValue('PENDING');

      await expect(service.settle('grant-1', NOW)).resolves.toBe('PENDING');
      expect(repo.update).not.toHaveBeenCalledWith(
        'grant-1',
        expect.objectContaining({ status: 'SUCCESS' }),
      );
    });

    it('does nothing when another request holds the grant', async () => {
      repo.claim.mockResolvedValue(null);

      await expect(service.settle('grant-1', NOW)).resolves.toBe('PENDING');
      expect(client.getPromotionKey).not.toHaveBeenCalled();
    });

    it('checks the saved key first and never pays twice', async () => {
      repo.claim.mockResolvedValue(grant({ rewardKey: 'key-0' }));

      await expect(service.settle('grant-1', NOW)).resolves.toBe('SUCCESS');

      expect(client.getPromotionResult).toHaveBeenCalledWith('anon-1', PROMO, 'key-0');
      expect(client.getPromotionKey).not.toHaveBeenCalled();
      expect(client.executePromotion).not.toHaveBeenCalled();
    });

    it('pays with a new key when nothing was paid with the saved key (4111)', async () => {
      repo.claim.mockResolvedValue(grant({ rewardKey: 'key-0' }));
      client.getPromotionResult
        .mockRejectedValueOnce(new TossPartnerError(200, '4111', '지급내역 없음'))
        .mockResolvedValueOnce('SUCCESS');

      await expect(service.settle('grant-1', NOW)).resolves.toBe('SUCCESS');
      expect(client.executePromotion).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'key-1' }),
      );
    });

    it('pays again with a new key when the previous payment FAILED (budget rolled back)', async () => {
      repo.claim.mockResolvedValue(grant({ rewardKey: 'key-0' }));
      client.getPromotionResult.mockResolvedValueOnce('FAILED').mockResolvedValueOnce('SUCCESS');

      await expect(service.settle('grant-1', NOW)).resolves.toBe('SUCCESS');
      expect(client.executePromotion).toHaveBeenCalledTimes(1);
    });

    it('records the error code and stays PENDING when the partner API fails', async () => {
      client.executePromotion.mockRejectedValue(new TossPartnerError(200, '4109', '실행중 아님'));

      await expect(service.settle('grant-1', NOW)).resolves.toBe('PENDING');
      expect(repo.update).toHaveBeenLastCalledWith('grant-1', {
        attempts: 1,
        lastError: '4109',
        status: 'PENDING',
      });
    });

    it('gives up after the last attempt', async () => {
      repo.claim.mockResolvedValue(grant({ attempts: MAX_GRANT_ATTEMPTS - 1 }));
      client.getPromotionKey.mockRejectedValue(new Error('socket hang up'));

      await expect(service.settle('grant-1', NOW)).resolves.toBe('FAILED');
    });

    it('keeps the grant PENDING without a promotion code', async () => {
      config.get.mockReturnValue(undefined);

      await expect(service.settle('grant-1', NOW)).resolves.toBe('PENDING');
      expect(client.getPromotionKey).not.toHaveBeenCalled();
    });

    it('fails a user without a real anonymous key at once', async () => {
      usersService.findById.mockResolvedValue({ id: USER_ID, anonKey: 'legacy:abc' });

      await expect(service.settle('grant-1', NOW)).resolves.toBe('FAILED');
      expect(repo.update).toHaveBeenLastCalledWith('grant-1', {
        attempts: 1,
        lastError: 'NO_ANON_KEY',
        status: 'FAILED',
      });
    });
  });

  describe('pending grants', () => {
    it('sums the pending amount', async () => {
      repo.findPendingByUserId.mockResolvedValue([grant(), grant({ id: 'grant-2', amount: 2 })]);

      await expect(service.pendingAmount(USER_ID)).resolves.toBe(3);
    });

    it('settles each pending grant in order', async () => {
      repo.findPendingByUserId.mockResolvedValue([grant(), grant({ id: 'grant-2' })]);

      await service.settlePending(USER_ID, NOW);

      expect(repo.claim.mock.calls.map(([id]) => id)).toEqual(['grant-1', 'grant-2']);
    });
  });
});
