import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { FishingService } from '../../fishing/fishing.service.js';
import { UsersService } from '../../users/users.service.js';
import { OutfitRepository } from '../outfit.repository.js';
import { OutfitService } from '../outfit.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-11-19T03:00:00Z');

const owned = (outfitCode: string, equipped = false) => ({ userId: USER_ID, outfitCode, equipped });

describe('OutfitService', () => {
  let service: OutfitService;
  const manager = { name: 'tx-manager' } as unknown as EntityManager;
  const repo = { findByUserId: jest.fn(), addOwned: jest.fn(), setEquipped: jest.fn() };
  const fishingService = { warehouseFish: jest.fn(), spendWarehouseFish: jest.fn() };
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
    repo.findByUserId.mockReset().mockResolvedValue([]);
    usersService.findById.mockReset().mockResolvedValue({ id: USER_ID });
    fishingService.warehouseFish.mockReset().mockResolvedValue(100_000);
    fishingService.spendWarehouseFish.mockReset().mockResolvedValue(52_000);

    const moduleRef = await Test.createTestingModule({
      providers: [
        OutfitService,
        { provide: OutfitRepository, useValue: repo },
        { provide: FishingService, useValue: fishingService },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(OutfitService);
  });

  describe('getOutfits', () => {
    it('returns every outfit with the warehouse fish', async () => {
      repo.findByUserId.mockResolvedValue([owned('straw_hat', true)]);

      const result = await service.getOutfits(USER_ID);

      expect(result.warehouseFish).toBe(100_000);
      expect(result.outfits).toHaveLength(13);
      expect(result.outfits.find((outfit) => outfit.code === 'straw_hat')).toMatchObject({
        owned: true,
        equipped: true,
        priceFish: 48_000,
      });
      expect(result.outfits.filter((outfit) => outfit.owned)).toHaveLength(1);
    });

    it('rejects unknown users', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getOutfits(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unlock', () => {
    it('spends the price from the warehouse, records the outfit and puts it on', async () => {
      const result = await service.unlock(USER_ID, 'straw_hat');

      expect(fishingService.spendWarehouseFish).toHaveBeenCalledWith(
        USER_ID,
        48_000,
        'OUTFIT',
        manager,
        NOW,
      );
      expect(repo.addOwned).toHaveBeenCalledWith(manager, USER_ID, 'straw_hat');
      expect(repo.setEquipped).toHaveBeenCalledWith(manager, USER_ID, ['straw_hat']);
      expect(result.warehouseFish).toBe(52_000);
      expect(result.outfits.find((outfit) => outfit.code === 'straw_hat')).toMatchObject({
        owned: true,
        equipped: true,
      });
    });

    it('takes off the outfit worn in the same slot and keeps the other slots', async () => {
      repo.findByUserId.mockResolvedValue([owned('straw_hat', true), owned('busan_tee', true)]);

      const result = await service.unlock(USER_ID, 'captain_hat');

      expect(repo.setEquipped).toHaveBeenCalledWith(manager, USER_ID, ['busan_tee', 'captain_hat']);
      const equipped = result.outfits.filter((outfit) => outfit.equipped).map(({ code }) => code);
      expect(equipped).toEqual(['captain_hat', 'busan_tee']);
      expect(result.outfits.find((outfit) => outfit.code === 'straw_hat')).toMatchObject({
        owned: true,
        equipped: false,
      });
    });

    it('fails without recording anything when the warehouse is short of fish', async () => {
      fishingService.spendWarehouseFish.mockRejectedValue(new ConflictException());

      await expect(service.unlock(USER_ID, 'straw_hat')).rejects.toBeInstanceOf(ConflictException);
      expect(repo.addOwned).not.toHaveBeenCalled();
      expect(repo.setEquipped).not.toHaveBeenCalled();
    });

    it('rejects an outfit that is already unlocked (the transaction rolls the fish back)', async () => {
      repo.findByUserId.mockResolvedValue([owned('straw_hat')]);

      await expect(service.unlock(USER_ID, 'straw_hat')).rejects.toBeInstanceOf(ConflictException);
      expect(repo.addOwned).not.toHaveBeenCalled();
    });

    it('reads the owned outfits inside the transaction, after the warehouse row is locked', async () => {
      await service.unlock(USER_ID, 'sunglasses');

      expect(repo.findByUserId).toHaveBeenCalledWith(USER_ID, manager);
      expect(fishingService.spendWarehouseFish.mock.invocationCallOrder[0]).toBeLessThan(
        repo.findByUserId.mock.invocationCallOrder[0],
      );
    });
  });

  describe('equip', () => {
    it('wears exactly the given outfits', async () => {
      repo.findByUserId.mockResolvedValue([
        owned('straw_hat', true),
        owned('sunglasses'),
        owned('busan_tee', true),
      ]);

      const result = await service.equip(USER_ID, ['sunglasses', 'busan_tee']);

      expect(repo.setEquipped).toHaveBeenCalledWith(manager, USER_ID, ['sunglasses', 'busan_tee']);
      const equipped = result.outfits.filter((outfit) => outfit.equipped).map(({ code }) => code);
      expect(equipped).toEqual(['sunglasses', 'busan_tee']);
      expect(result.warehouseFish).toBe(100_000);
      expect(fishingService.spendWarehouseFish).not.toHaveBeenCalled();
    });

    it('takes everything off with an empty list', async () => {
      repo.findByUserId.mockResolvedValue([owned('straw_hat', true)]);

      const result = await service.equip(USER_ID, []);

      expect(repo.setEquipped).toHaveBeenCalledWith(manager, USER_ID, []);
      expect(result.outfits.some((outfit) => outfit.equipped)).toBe(false);
    });

    it('refuses an outfit that is not unlocked', async () => {
      await expect(service.equip(USER_ID, ['straw_hat'])).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.setEquipped).not.toHaveBeenCalled();
    });

    it('refuses two outfits in the same slot', async () => {
      repo.findByUserId.mockResolvedValue([owned('straw_hat'), owned('captain_hat')]);

      await expect(service.equip(USER_ID, ['straw_hat', 'captain_hat'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.setEquipped).not.toHaveBeenCalled();
    });
  });
});
