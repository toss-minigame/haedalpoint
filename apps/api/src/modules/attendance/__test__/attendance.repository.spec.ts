import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type EntityManager, LessThanOrEqual } from 'typeorm';
import { AttendanceRepository } from '../attendance.repository.js';
import { AttendanceLog } from '../entities/attendance-log.entity.js';

describe('AttendanceRepository', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let repository: AttendanceRepository;
  const typeormRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    countBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const data = {
    userId: USER_ID,
    checkedDate: '2026-10-30',
    attendanceDay: 1,
    rewardType: 'TOSS_POINT' as const,
    rewardAmount: 1,
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

  it('finds the latest log by date', async () => {
    typeormRepo.findOne.mockResolvedValue(null);

    await repository.findLatestByUserId(USER_ID);

    expect(typeormRepo.findOne).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      order: { checkedDate: 'DESC' },
    });
  });

  it('counts every attendance of the user', async () => {
    typeormRepo.countBy.mockResolvedValue(3);

    await expect(repository.countByUserId(USER_ID)).resolves.toBe(3);
    expect(typeormRepo.countBy).toHaveBeenCalledWith({ userId: USER_ID });
  });

  it('finds the first days in day order', async () => {
    typeormRepo.find.mockResolvedValue([]);

    await repository.findFirstDays(USER_ID, 7);

    expect(typeormRepo.find).toHaveBeenCalledWith({
      where: { userId: USER_ID, attendanceDay: LessThanOrEqual(7) },
      order: { attendanceDay: 'ASC' },
    });
  });

  it('creates and saves a log', async () => {
    typeormRepo.create.mockReturnValue(data);
    typeormRepo.save.mockResolvedValue({ id: 'log-1', ...data });

    await expect(repository.create(data)).resolves.toMatchObject({ id: 'log-1' });
    expect(typeormRepo.save).toHaveBeenCalledWith(data);
  });

  it("creates a log inside the caller's transaction", async () => {
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
});
