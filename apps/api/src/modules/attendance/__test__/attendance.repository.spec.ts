import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type EntityManager, IsNull } from 'typeorm';
import { AttendanceRepository } from '../attendance.repository.js';
import { AttendanceLog } from '../entities/attendance-log.entity.js';

describe('AttendanceRepository', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let repository: AttendanceRepository;
  const typeormRepo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceRepository,
        { provide: getRepositoryToken(AttendanceLog), useValue: typeormRepo },
      ],
    }).compile();
    repository = moduleRef.get(AttendanceRepository);
  });

  it('finds recent logs newest first with a limit', async () => {
    typeormRepo.find.mockResolvedValue([]);

    await repository.findRecentByUserId(USER_ID, 7);

    expect(typeormRepo.find).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      order: { checkedDate: 'DESC' },
      take: 7,
    });
  });

  it('finds a log by user and date', async () => {
    typeormRepo.findOneBy.mockResolvedValue(null);

    await repository.findByUserIdAndDate(USER_ID, '2026-10-30');

    expect(typeormRepo.findOneBy).toHaveBeenCalledWith({
      userId: USER_ID,
      checkedDate: '2026-10-30',
    });
  });

  it('creates and saves a log', async () => {
    const data = {
      userId: USER_ID,
      checkedDate: '2026-10-30',
      streakDay: 1,
      rewardType: 'ENHANCE_BONUS' as const,
      rewardAmount: 1,
      cycleCompleted: false,
    };
    typeormRepo.create.mockReturnValue(data);
    typeormRepo.save.mockResolvedValue({ id: 'log-1', ...data });

    await expect(repository.create(data)).resolves.toMatchObject({ id: 'log-1' });
    expect(typeormRepo.save).toHaveBeenCalledWith(data);
  });

  it("creates a log inside the caller's transaction", async () => {
    const data = {
      userId: USER_ID,
      checkedDate: '2026-10-30',
      streakDay: 1,
      rewardType: 'ENHANCE_BONUS' as const,
      rewardAmount: 1,
      cycleCompleted: false,
    };
    const txRepo = { create: jest.fn().mockReturnValue(data), save: jest.fn() };
    txRepo.save.mockResolvedValue({ id: 'log-1', ...data });
    const manager = { getRepository: jest.fn().mockReturnValue(txRepo) };

    await expect(
      repository.create(data, manager as unknown as EntityManager),
    ).resolves.toMatchObject({ id: 'log-1' });
    expect(manager.getRepository).toHaveBeenCalledWith(AttendanceLog);
    expect(txRepo.save).toHaveBeenCalledWith(data);
    expect(typeormRepo.save).not.toHaveBeenCalled();
  });

  it.each([
    [1, true],
    [0, false],
  ])(
    'claims the ad bonus only when not yet claimed (affected=%p → %p)',
    async (affected, expected) => {
      const claimedAt = new Date('2026-11-02T03:00:00Z');
      typeormRepo.update.mockResolvedValue({ affected });

      await expect(repository.claimAdBonus('log-1', claimedAt)).resolves.toBe(expected);
      expect(typeormRepo.update).toHaveBeenCalledWith(
        { id: 'log-1', adBonusClaimedAt: IsNull() },
        { adBonusClaimedAt: claimedAt },
      );
    },
  );
});
