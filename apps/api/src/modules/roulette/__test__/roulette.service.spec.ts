import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { FishingService } from '../../fishing/fishing.service.js';
import { UsersService } from '../../users/users.service.js';
import { baitsOfMonth, TOTAL_BAIT_WEIGHT } from '../lib/pick-bait.js';
import { RouletteRoller } from '../lib/roulette-roller.js';
import { RouletteRepository } from '../roulette.repository.js';
import { RouletteService } from '../roulette.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
// KST 2026-11-10 12:00
const NOW = new Date('2026-11-10T03:00:00Z');
const TODAY = '2026-11-10';
const SPUN_AT = new Date('2026-11-10T01:00:00Z');

function spinRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'spin-1',
    userId: USER_ID,
    spinDate: TODAY,
    fishCode: 'hairtail',
    fishName: '갈치',
    speedBonusPercent: 3,
    appliedAt: null,
    createdAt: SPUN_AT,
    updatedAt: SPUN_AT,
    ...overrides,
  };
}

function uniqueViolation() {
  return Object.assign(new Error('duplicate key'), { code: '23505' });
}

describe('RouletteService', () => {
  let service: RouletteService;
  const manager = { name: 'tx-manager' } as unknown as EntityManager;
  const repo = { findSpin: jest.fn(), createSpin: jest.fn(), markApplied: jest.fn() };
  const usersService = { findById: jest.fn() };
  const fishingService = { applyBait: jest.fn() };
  const roller = { roll: jest.fn() };
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
    jest.resetAllMocks();
    usersService.findById.mockResolvedValue({ id: USER_ID });
    repo.findSpin.mockResolvedValue(null);
    repo.createSpin.mockImplementation(async (data: object) => ({
      id: 'spin-1',
      appliedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...data,
    }));
    repo.markApplied.mockResolvedValue(true);
    dataSource.transaction.mockImplementation(async (work: (m: EntityManager) => unknown) =>
      work(manager),
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        RouletteService,
        { provide: RouletteRepository, useValue: repo },
        { provide: UsersService, useValue: usersService },
        { provide: FishingService, useValue: fishingService },
        { provide: RouletteRoller, useValue: roller },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(RouletteService);
  });

  describe('getToday', () => {
    it("shows this month's baits and lets the user spin before today's spin", async () => {
      await expect(service.getToday(USER_ID)).resolves.toEqual({
        date: TODAY,
        month: 11,
        fishes: baitsOfMonth(11),
        spin: null,
        canSpin: true,
        canApply: false,
        resetAt: '2026-11-10T15:00:00.000Z',
      });
      expect(repo.findSpin).toHaveBeenCalledWith(USER_ID, TODAY);
    });

    it("lets the user apply today's spin until it is applied", async () => {
      repo.findSpin.mockResolvedValue(spinRow());

      await expect(service.getToday(USER_ID)).resolves.toMatchObject({
        spin: {
          fishCode: 'hairtail',
          fishName: '갈치',
          speedBonusPercent: 3,
          spunAt: SPUN_AT.toISOString(),
          appliedAt: null,
        },
        canSpin: false,
        canApply: true,
      });
    });

    it('closes both after the bait is applied', async () => {
      repo.findSpin.mockResolvedValue(spinRow({ appliedAt: NOW }));

      await expect(service.getToday(USER_ID)).resolves.toMatchObject({
        spin: { appliedAt: NOW.toISOString() },
        canSpin: false,
        canApply: false,
      });
    });

    it('rejects unknown users', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getToday(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findSpin).not.toHaveBeenCalled();
    });
  });

  describe('spin', () => {
    it.each([
      [0, 'saury', 1],
      [40, 'mullet', 2],
      [70, 'hairtail', 3],
      [99, 'yellowtail', 5],
    ])('saves the bait picked by roll %i without applying it', async (roll, code, bonus) => {
      roller.roll.mockReturnValue(roll);

      const result = await service.spin(USER_ID);

      expect(roller.roll).toHaveBeenCalledWith(TOTAL_BAIT_WEIGHT);
      expect(repo.createSpin).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          spinDate: TODAY,
          fishCode: code,
          speedBonusPercent: bonus,
        }),
      );
      expect(result).toMatchObject({ fishCode: code, speedBonusPercent: bonus, appliedAt: null });
      expect(fishingService.applyBait).not.toHaveBeenCalled();
    });

    it('rejects a second spin on the same day', async () => {
      repo.findSpin.mockResolvedValue(spinRow());

      await expect(service.spin(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(roller.roll).not.toHaveBeenCalled();
      expect(repo.createSpin).not.toHaveBeenCalled();
    });

    it('turns a concurrent second spin into a conflict', async () => {
      roller.roll.mockReturnValue(0);
      repo.createSpin.mockRejectedValue(uniqueViolation());

      await expect(service.spin(USER_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows other database errors', async () => {
      roller.roll.mockReturnValue(0);
      repo.createSpin.mockRejectedValue(new Error('connection lost'));

      await expect(service.spin(USER_ID)).rejects.toThrow('connection lost');
    });
  });

  describe('applyAdBait', () => {
    it("records the apply and boosts today's speed in one transaction", async () => {
      repo.findSpin.mockResolvedValue(spinRow());

      const result = await service.applyAdBait(USER_ID);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(repo.markApplied).toHaveBeenCalledWith('spin-1', NOW, manager);
      expect(fishingService.applyBait).toHaveBeenCalledWith(USER_ID, 3, manager, NOW);
      expect(result).toMatchObject({ fishCode: 'hairtail', appliedAt: NOW.toISOString() });
    });

    it('rejects when there is no spin today', async () => {
      await expect(service.applyAdBait(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejects when the bait is already applied', async () => {
      repo.findSpin.mockResolvedValue(spinRow({ appliedAt: SPUN_AT }));

      await expect(service.applyAdBait(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.applyBait).not.toHaveBeenCalled();
    });

    it('does not boost when a concurrent request applied it first', async () => {
      repo.findSpin.mockResolvedValue(spinRow());
      repo.markApplied.mockResolvedValue(false);

      await expect(service.applyAdBait(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.applyBait).not.toHaveBeenCalled();
    });
  });
});
