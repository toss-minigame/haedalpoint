import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type EntityManager, IsNull } from 'typeorm';
import { RouletteSpin } from '../entities/roulette-spin.entity.js';
import { RouletteRepository } from '../roulette.repository.js';

describe('RouletteRepository', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  const TODAY = '2026-11-10';
  let repository: RouletteRepository;
  const spinRepo = { findOneBy: jest.fn(), create: jest.fn(), save: jest.fn() };
  const txSpinRepo = { update: jest.fn() };
  const manager = { getRepository: jest.fn(() => txSpinRepo) } as unknown as EntityManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RouletteRepository,
        { provide: getRepositoryToken(RouletteSpin), useValue: spinRepo },
      ],
    }).compile();
    repository = moduleRef.get(RouletteRepository);
  });

  it("finds the user's spin of the day", async () => {
    spinRepo.findOneBy.mockResolvedValue(null);

    await repository.findSpin(USER_ID, TODAY);

    expect(spinRepo.findOneBy).toHaveBeenCalledWith({ userId: USER_ID, spinDate: TODAY });
  });

  it('creates a spin that is not applied yet', async () => {
    const data = {
      userId: USER_ID,
      spinDate: TODAY,
      fishCode: 'yellowtail',
      fishName: '방어',
      speedBonusPercent: 5,
    };
    spinRepo.create.mockImplementation((value: object) => value);
    spinRepo.save.mockImplementation(async (value: object) => ({ id: 'spin-1', ...value }));

    await expect(repository.createSpin(data)).resolves.toMatchObject({ id: 'spin-1', ...data });
    expect(spinRepo.create).toHaveBeenCalledWith({ ...data, appliedAt: null });
  });

  it('marks the spin applied only when it is not applied yet', async () => {
    const at = new Date('2026-11-10T03:00:00Z');
    txSpinRepo.update.mockResolvedValue({ affected: 1 });

    await expect(repository.markApplied('spin-1', at, manager)).resolves.toBe(true);
    expect(manager.getRepository).toHaveBeenCalledWith(RouletteSpin);
    expect(txSpinRepo.update).toHaveBeenCalledWith(
      { id: 'spin-1', appliedAt: IsNull() },
      { appliedAt: at },
    );
  });

  it('reports false when another request already applied it', async () => {
    txSpinRepo.update.mockResolvedValue({ affected: 0 });

    await expect(repository.markApplied('spin-1', new Date(), manager)).resolves.toBe(false);
  });
});
