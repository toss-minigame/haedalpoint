import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { AD_ROD_POLICY, HAMMOCK_EXPAND_POLICY, ROD_POLICY } from '../../../common/globals/index.js';
import { UsersService } from '../../users/users.service.js';
import { FishingRepository } from '../fishing.repository.js';
import { FishingService } from '../fishing.service.js';
import { milliFishPerMs } from '../lib/fishing-rate.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const HOUR_MS = 60 * 60 * 1000;
// KST 2026-11-02 12:00
const NOW = new Date('2026-11-02T03:00:00Z');
const TODAY = '2026-11-02';
const AN_HOUR_AGO = new Date(NOW.getTime() - HOUR_MS);
const CAUGHT_IN_AN_HOUR = Math.floor(HOUR_MS * milliFishPerMs(100));
const MINUTE_MS = 60 * 1000;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'state-1',
    userId: USER_ID,
    hammockMilliFish: 0,
    settledAt: AN_HOUR_AGO,
    rodLevel: 0,
    rodLevelDate: null,
    otterFriendDate: null,
    otterFriendCount: 0,
    hammockLevel: 0,
    hammockLevelDate: null,
    adRodEnhancedAt: null,
    adHammockExpandedAt: null,
    warehouseFish: 100,
    ...overrides,
  };
}

describe('FishingService', () => {
  let service: FishingService;
  const manager = { name: 'tx-manager' } as unknown as EntityManager;
  const repo = {
    findOrCreate: jest.fn(),
    lockOrCreate: jest.fn(),
    updateState: jest.fn(),
    addLedgerEntry: jest.fn(),
  };
  const usersService = { findById: jest.fn() };
  const dataSource = {
    transaction: jest.fn(async (work: (m: EntityManager) => unknown) => work(manager)),
  };

  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.findOrCreate.mockReset();
    repo.lockOrCreate.mockReset();
    usersService.findById.mockReset().mockResolvedValue({ id: USER_ID });

    const moduleRef = await Test.createTestingModule({
      providers: [
        FishingService,
        { provide: FishingRepository, useValue: repo },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(FishingService);
  });

  describe('getStatus', () => {
    it('returns the hammock settled up to now without saving it', async () => {
      repo.findOrCreate.mockResolvedValue(row());

      const status = await service.getStatus(USER_ID);

      expect(repo.findOrCreate).toHaveBeenCalledWith(USER_ID, NOW);
      expect(status.hammockFish).toBe(CAUGHT_IN_AN_HOUR / 1000);
      expect(status.warehouseFish).toBe(100);
      expect(repo.updateState).not.toHaveBeenCalled();
    });

    it('rejects unknown users', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getStatus(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('storeFish', () => {
    it('moves the whole fish to the warehouse and records the ledger in one transaction', async () => {
      repo.lockOrCreate.mockResolvedValue(row());
      const storedFish = Math.floor(CAUGHT_IN_AN_HOUR / 1000);

      const result = await service.storeFish(USER_ID);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(repo.lockOrCreate).toHaveBeenCalledWith(manager, USER_ID, NOW);
      expect(repo.updateState).toHaveBeenCalledWith(manager, 'state-1', {
        hammockMilliFish: CAUGHT_IN_AN_HOUR % 1000,
        settledAt: NOW,
        rodLevel: 0,
        rodLevelDate: null,
        otterFriendDate: null,
        otterFriendCount: 0,
        hammockLevel: 0,
        hammockLevelDate: null,
        warehouseFish: 100 + storedFish,
      });
      expect(repo.addLedgerEntry).toHaveBeenCalledWith(manager, {
        userId: USER_ID,
        type: 'STORE',
        amount: storedFish,
      });
      expect(result).toEqual({
        storedFish,
        warehouseFish: 100 + storedFish,
        hammockFish: (CAUGHT_IN_AN_HOUR % 1000) / 1000,
      });
    });

    it('rejects when there is less than one fish', async () => {
      repo.lockOrCreate.mockResolvedValue(row({ settledAt: NOW, hammockMilliFish: 999 }));

      await expect(service.storeFish(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateState).not.toHaveBeenCalled();
      expect(repo.addLedgerEntry).not.toHaveBeenCalled();
    });
  });

  describe('enhanceRod', () => {
    it("settles first, then raises today's rod level inside the caller's transaction", async () => {
      repo.lockOrCreate.mockResolvedValue(row({ rodLevel: 2, rodLevelDate: TODAY }));

      const result = await service.enhanceRod(USER_ID, 1, manager, NOW);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(repo.updateState).toHaveBeenCalledWith(
        manager,
        'state-1',
        expect.objectContaining({
          hammockMilliFish: Math.floor(HOUR_MS * milliFishPerMs(120)),
          settledAt: NOW,
          rodLevel: 3,
          rodLevelDate: TODAY,
        }),
      );
      expect(result).toEqual({ rodLevel: 3, rodSpeedBonusPercent: 30 });
    });

    it('applies the boost to the later day when another server already settled past midnight', async () => {
      // 시계가 빠른 서버가 KST 11-03 00:00:01 에 정산해 둔 상태에서, 정상 시계(11-02 12:00)로 강화 요청
      const settledTomorrow = new Date('2026-11-02T15:00:01Z');
      repo.lockOrCreate.mockResolvedValue(
        row({ settledAt: settledTomorrow, rodLevel: 2, rodLevelDate: '2026-11-03' }),
      );

      const result = await service.enhanceRod(USER_ID, 1, manager, NOW);

      expect(repo.updateState).toHaveBeenCalledWith(
        manager,
        'state-1',
        expect.objectContaining({
          settledAt: settledTomorrow,
          rodLevel: 3,
          rodLevelDate: '2026-11-03',
        }),
      );
      expect(result.rodLevel).toBe(3);
    });

    it('stops at the max level', async () => {
      repo.lockOrCreate.mockResolvedValue(
        row({ rodLevel: ROD_POLICY.MAX_LEVEL, rodLevelDate: TODAY }),
      );

      await expect(service.enhanceRod(USER_ID, 1, manager, NOW)).resolves.toMatchObject({
        rodLevel: ROD_POLICY.MAX_LEVEL,
      });
    });
  });

  describe('summonOtterFriend', () => {
    it('settles first, then activates the otter friend for today', async () => {
      repo.lockOrCreate.mockResolvedValue(row());

      await service.summonOtterFriend(USER_ID, manager, NOW);

      expect(repo.updateState).toHaveBeenCalledWith(
        manager,
        'state-1',
        expect.objectContaining({
          hammockMilliFish: CAUGHT_IN_AN_HOUR,
          settledAt: NOW,
          otterFriendDate: TODAY,
          otterFriendCount: 1,
        }),
      );
    });

    it('adds a second otter friend on the same day', async () => {
      repo.lockOrCreate.mockResolvedValue(row({ otterFriendDate: TODAY, otterFriendCount: 1 }));

      await service.summonOtterFriend(USER_ID, manager, NOW);

      expect(repo.updateState).toHaveBeenCalledWith(
        manager,
        'state-1',
        expect.objectContaining({ otterFriendDate: TODAY, otterFriendCount: 2 }),
      );
    });
  });

  describe('adEnhanceRod', () => {
    it('settles, raises the rod level and starts the cooldown in one transaction', async () => {
      repo.lockOrCreate.mockResolvedValue(row({ rodLevel: 2, rodLevelDate: TODAY }));

      const status = await service.adEnhanceRod(USER_ID);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(repo.updateState).toHaveBeenCalledWith(
        manager,
        'state-1',
        expect.objectContaining({
          hammockMilliFish: Math.floor(HOUR_MS * milliFishPerMs(120)),
          settledAt: NOW,
          rodLevel: 2 + AD_ROD_POLICY.LEVELS_PER_AD,
          rodLevelDate: TODAY,
          adRodEnhancedAt: NOW,
        }),
      );
      expect(status).toMatchObject({
        rodLevel: 2 + AD_ROD_POLICY.LEVELS_PER_AD,
        adRodEnhanceAvailableAt: new Date(
          NOW.getTime() + AD_ROD_POLICY.COOLDOWN_MINUTES * MINUTE_MS,
        ).toISOString(),
      });
    });

    it('rejects during the cooldown', async () => {
      const lastEnhancedAt = new Date(
        NOW.getTime() - (AD_ROD_POLICY.COOLDOWN_MINUTES - 1) * MINUTE_MS,
      );
      repo.lockOrCreate.mockResolvedValue(row({ adRodEnhancedAt: lastEnhancedAt }));

      await expect(service.adEnhanceRod(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateState).not.toHaveBeenCalled();
    });

    it('allows it again once the cooldown has passed', async () => {
      const lastEnhancedAt = new Date(NOW.getTime() - AD_ROD_POLICY.COOLDOWN_MINUTES * MINUTE_MS);
      repo.lockOrCreate.mockResolvedValue(row({ adRodEnhancedAt: lastEnhancedAt }));

      await expect(service.adEnhanceRod(USER_ID)).resolves.toMatchObject({ rodLevel: 1 });
    });

    it("rejects when today's rod level is already at the max", async () => {
      repo.lockOrCreate.mockResolvedValue(
        row({ rodLevel: ROD_POLICY.MAX_LEVEL, rodLevelDate: TODAY }),
      );

      await expect(service.adEnhanceRod(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateState).not.toHaveBeenCalled();
    });

    it("ignores yesterday's max level", async () => {
      repo.lockOrCreate.mockResolvedValue(
        row({ rodLevel: ROD_POLICY.MAX_LEVEL, rodLevelDate: '2026-11-01' }),
      );

      await expect(service.adEnhanceRod(USER_ID)).resolves.toMatchObject({ rodLevel: 1 });
    });

    it('rejects unknown users', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.adEnhanceRod(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('adExpandHammock', () => {
    it('settles, raises the hammock level and starts the cooldown in one transaction', async () => {
      repo.lockOrCreate.mockResolvedValue(row({ hammockLevel: 2, hammockLevelDate: TODAY }));

      const status = await service.adExpandHammock(USER_ID);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(repo.updateState).toHaveBeenCalledWith(
        manager,
        'state-1',
        expect.objectContaining({
          hammockMilliFish: CAUGHT_IN_AN_HOUR,
          settledAt: NOW,
          hammockLevel: 2 + HAMMOCK_EXPAND_POLICY.LEVELS_PER_AD,
          hammockLevelDate: TODAY,
          adHammockExpandedAt: NOW,
        }),
      );
      expect(status).toMatchObject({
        hammockLevel: 2 + HAMMOCK_EXPAND_POLICY.LEVELS_PER_AD,
        adHammockExpandAvailableAt: new Date(
          NOW.getTime() + HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES * MINUTE_MS,
        ).toISOString(),
      });
    });

    it('rejects during the cooldown', async () => {
      const lastExpandedAt = new Date(
        NOW.getTime() - (HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES - 1) * MINUTE_MS,
      );
      repo.lockOrCreate.mockResolvedValue(row({ adHammockExpandedAt: lastExpandedAt }));

      await expect(service.adExpandHammock(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateState).not.toHaveBeenCalled();
    });

    it('allows it again once the cooldown has passed', async () => {
      const lastExpandedAt = new Date(
        NOW.getTime() - HAMMOCK_EXPAND_POLICY.COOLDOWN_MINUTES * MINUTE_MS,
      );
      repo.lockOrCreate.mockResolvedValue(row({ adHammockExpandedAt: lastExpandedAt }));

      await expect(service.adExpandHammock(USER_ID)).resolves.toMatchObject({ hammockLevel: 1 });
    });

    it("rejects when today's hammock is already at the max level", async () => {
      repo.lockOrCreate.mockResolvedValue(
        row({ hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL, hammockLevelDate: TODAY }),
      );

      await expect(service.adExpandHammock(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateState).not.toHaveBeenCalled();
    });

    it("starts again from level 1 after yesterday's max level", async () => {
      repo.lockOrCreate.mockResolvedValue(
        row({ hammockLevel: HAMMOCK_EXPAND_POLICY.MAX_LEVEL, hammockLevelDate: '2026-11-01' }),
      );

      await expect(service.adExpandHammock(USER_ID)).resolves.toMatchObject({ hammockLevel: 1 });
    });
  });
});
