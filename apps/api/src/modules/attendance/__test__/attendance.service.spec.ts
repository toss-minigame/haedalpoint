import { ConflictException, NotFoundException, NotImplementedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersService } from '../../users/users.service';
import { AttendanceRepository } from '../attendance.repository';
import { AttendanceService } from '../attendance.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
// KST 2026-10-30 12:00
const NOW = new Date('2026-10-30T03:00:00Z');
const TODAY = '2026-10-30';

function log(checkedDate: string, streakDay: number, cycleCompleted = streakDay === 7) {
  return { checkedDate, streakDay, cycleCompleted, adBonusClaimedAt: null };
}

describe('AttendanceService', () => {
  let service: AttendanceService;
  const repo = {
    findRecentByUserId: jest.fn(),
    findByUserIdAndDate: jest.fn(),
    create: jest.fn(),
  };
  const usersService = { findById: jest.fn() };

  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    usersService.findById.mockResolvedValue({ id: USER_ID });
    repo.create.mockImplementation(async (data: object) => ({ id: 'log-1', ...data }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: repo },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = moduleRef.get(AttendanceService);
  });

  describe('checkIn', () => {
    it('gives day 1 ENHANCE_BONUS 1 on first check-in', async () => {
      repo.findRecentByUserId.mockResolvedValue([]);

      await expect(service.checkIn(USER_ID)).resolves.toEqual({
        checkedDate: TODAY,
        streakDay: 1,
        reward: { type: 'ENHANCE_BONUS', amount: 1 },
        cycleCompleted: false,
      });
      expect(repo.create).toHaveBeenCalledWith({
        userId: USER_ID,
        checkedDate: TODAY,
        streakDay: 1,
        rewardType: 'ENHANCE_BONUS',
        rewardAmount: 1,
        cycleCompleted: false,
      });
    });

    it('increments the streak when checked in yesterday', async () => {
      repo.findRecentByUserId.mockResolvedValue([log('2026-10-29', 3)]);

      await expect(service.checkIn(USER_ID)).resolves.toMatchObject({
        streakDay: 4,
        reward: { type: 'ENHANCE_BONUS', amount: 4 },
      });
    });

    it('resets to day 1 when yesterday was missed', async () => {
      repo.findRecentByUserId.mockResolvedValue([log('2026-10-28', 5)]);

      await expect(service.checkIn(USER_ID)).resolves.toMatchObject({ streakDay: 1 });
    });

    it('completes the cycle with OTTER_FRIEND on day 7', async () => {
      repo.findRecentByUserId.mockResolvedValue([log('2026-10-29', 6)]);

      await expect(service.checkIn(USER_ID)).resolves.toEqual({
        checkedDate: TODAY,
        streakDay: 7,
        reward: { type: 'OTTER_FRIEND', amount: 1 },
        cycleCompleted: true,
      });
    });

    it('restarts at day 1 the day after a completed cycle', async () => {
      repo.findRecentByUserId.mockResolvedValue([log('2026-10-29', 7)]);

      await expect(service.checkIn(USER_ID)).resolves.toMatchObject({
        streakDay: 1,
        cycleCompleted: false,
      });
    });

    it('throws ConflictException when already checked in today', async () => {
      repo.findRecentByUserId.mockResolvedValue([log(TODAY, 2)]);

      await expect(service.checkIn(USER_ID)).rejects.toThrow(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('converts a unique violation (23505) into ConflictException', async () => {
      repo.findRecentByUserId.mockResolvedValue([]);
      repo.create.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));

      await expect(service.checkIn(USER_ID)).rejects.toThrow(ConflictException);
    });

    it('rethrows other database errors', async () => {
      repo.findRecentByUserId.mockResolvedValue([]);
      const dbError = Object.assign(new Error('connection lost'), { code: '08006' });
      repo.create.mockRejectedValue(dbError);

      await expect(service.checkIn(USER_ID)).rejects.toBe(dbError);
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.checkIn(USER_ID)).rejects.toThrow(NotFoundException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('loads one cycle worth of logs and assembles the status', async () => {
      repo.findRecentByUserId.mockResolvedValue([log(TODAY, 2), log('2026-10-29', 1)]);

      const status = await service.getStatus(USER_ID);

      expect(repo.findRecentByUserId).toHaveBeenCalledWith(USER_ID, 7);
      expect(status).toMatchObject({
        today: TODAY,
        checkedToday: true,
        currentStreakDay: 2,
        nextStreakDay: 3,
        adBonusAvailable: true,
      });
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getStatus(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('claimAdBonus', () => {
    it('throws ConflictException when bonus was already claimed', async () => {
      repo.findByUserIdAndDate.mockResolvedValue({
        ...log(TODAY, 1),
        adBonusClaimedAt: new Date(),
      });

      await expect(service.claimAdBonus(USER_ID)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when not checked in today', async () => {
      repo.findByUserIdAndDate.mockResolvedValue(null);

      await expect(service.claimAdBonus(USER_ID)).rejects.toThrow(NotFoundException);
      expect(repo.findByUserIdAndDate).toHaveBeenCalledWith(USER_ID, TODAY);
    });

    it('throws NotImplementedException otherwise', async () => {
      repo.findByUserIdAndDate.mockResolvedValue(log(TODAY, 1));

      await expect(service.claimAdBonus(USER_ID)).rejects.toThrow(NotImplementedException);
    });
  });
});
