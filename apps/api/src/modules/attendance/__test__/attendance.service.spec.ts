import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { FishingService } from '../../fishing/fishing.service.js';
import { TossPointService } from '../../toss-point/toss-point.service.js';
import { UsersService } from '../../users/users.service.js';
import { AttendanceRepository } from '../attendance.repository.js';
import { AttendanceService } from '../attendance.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
// KST 2026-10-30 12:00
const NOW = new Date('2026-10-30T03:00:00Z');
const TODAY = '2026-10-30';
const YESTERDAY = '2026-10-29';

describe('AttendanceService', () => {
  let service: AttendanceService;
  const repo = {
    findLatestByUserId: jest.fn(),
    countByUserId: jest.fn(),
    findFirstDays: jest.fn(),
    create: jest.fn(),
  };
  const usersService = { findById: jest.fn() };
  const manager = { name: 'tx-manager' } as unknown as EntityManager;
  const fishingService = { enhanceRod: jest.fn(), summonOtterFriend: jest.fn() };
  const tossPointService = {
    createGrant: jest.fn(),
    settle: jest.fn(),
    settlePending: jest.fn(),
    pendingAmount: jest.fn(),
  };
  const dataSource = { transaction: jest.fn() };

  /** 지금까지 출석한 일수와 마지막 출석 날짜 */
  function attended(days: number, lastDate: string | null = days > 0 ? YESTERDAY : null) {
    repo.countByUserId.mockResolvedValue(days);
    repo.findLatestByUserId.mockResolvedValue(lastDate ? { checkedDate: lastDate } : null);
  }

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
    tossPointService.createGrant.mockResolvedValue({ id: 'grant-1' });
    tossPointService.settle.mockResolvedValue('SUCCESS');
    dataSource.transaction.mockImplementation(async (work: (m: EntityManager) => unknown) =>
      work(manager),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceRepository, useValue: repo },
        { provide: UsersService, useValue: usersService },
        { provide: FishingService, useValue: fishingService },
        { provide: TossPointService, useValue: tossPointService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(AttendanceService);
  });

  describe('checkIn', () => {
    it('records day 1 and pays 1 toss point after the transaction', async () => {
      attended(0);

      await expect(service.checkIn(USER_ID)).resolves.toEqual({
        checkedDate: TODAY,
        attendanceDay: 1,
        reward: { type: 'TOSS_POINT', amount: 1 },
        tossPointGrant: 'SUCCESS',
      });
      expect(repo.create).toHaveBeenCalledWith(
        {
          userId: USER_ID,
          checkedDate: TODAY,
          attendanceDay: 1,
          rewardType: 'TOSS_POINT',
          rewardAmount: 1,
          rewardAppliedAt: NOW,
        },
        manager,
      );
      expect(tossPointService.createGrant).toHaveBeenCalledWith(manager, {
        userId: USER_ID,
        source: 'ATTENDANCE',
        sourceId: 'log-1',
        amount: 1,
      });
      expect(tossPointService.settle).toHaveBeenCalledWith('grant-1');
      expect(fishingService.enhanceRod).not.toHaveBeenCalled();
    });

    it('counts attendance days even when a day was skipped', async () => {
      attended(3, '2026-10-20');

      const result = await service.checkIn(USER_ID);

      expect(result.attendanceDay).toBe(4);
      expect(result.reward).toEqual({ type: 'TOSS_POINT', amount: 1 });
    });

    it('returns PENDING when the payment is not confirmed yet', async () => {
      attended(5);
      tossPointService.settle.mockResolvedValue('PENDING');

      await expect(service.checkIn(USER_ID)).resolves.toMatchObject({
        attendanceDay: 6,
        tossPointGrant: 'PENDING',
      });
    });

    it('brings the otter friend on day 7 in the same transaction', async () => {
      attended(6);

      await expect(service.checkIn(USER_ID)).resolves.toMatchObject({
        attendanceDay: 7,
        reward: { type: 'OTTER_FRIEND', amount: 1 },
        tossPointGrant: null,
      });
      expect(fishingService.summonOtterFriend).toHaveBeenCalledWith(USER_ID, manager, NOW);
      expect(tossPointService.createGrant).not.toHaveBeenCalled();
      expect(tossPointService.settle).not.toHaveBeenCalled();
    });

    it('enhances the rod by 10 levels from day 8', async () => {
      attended(7);

      await expect(service.checkIn(USER_ID)).resolves.toMatchObject({
        attendanceDay: 8,
        reward: { type: 'ENHANCE_BONUS', amount: 10 },
        tossPointGrant: null,
      });
      expect(fishingService.enhanceRod).toHaveBeenCalledWith(USER_ID, 10, manager, NOW);
    });

    it('rejects a second check-in on the same day', async () => {
      attended(2, TODAY);

      await expect(service.checkIn(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('maps a unique violation from a double tap to a conflict', async () => {
      attended(0);
      repo.create.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }));

      await expect(service.checkIn(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(tossPointService.settle).not.toHaveBeenCalled();
    });

    it('does not pay when the reward could not be applied', async () => {
      attended(0);
      tossPointService.createGrant.mockRejectedValue(new Error('db down'));

      await expect(service.checkIn(USER_ID)).rejects.toThrow('db down');
      expect(tossPointService.settle).not.toHaveBeenCalled();
    });

    it('rejects unknown users', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.checkIn(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('retries pending payments, then builds the status', async () => {
      attended(2, TODAY);
      repo.findFirstDays.mockResolvedValue([
        { attendanceDay: 1, checkedDate: YESTERDAY },
        { attendanceDay: 2, checkedDate: TODAY },
      ]);
      tossPointService.pendingAmount.mockResolvedValue(1);

      const status = await service.getStatus(USER_ID);

      expect(tossPointService.settlePending).toHaveBeenCalledWith(USER_ID);
      expect(repo.findFirstDays).toHaveBeenCalledWith(USER_ID, 7);
      expect(status).toMatchObject({
        today: TODAY,
        checkedToday: true,
        attendanceDays: 2,
        firstWeekCompleted: false,
        nextReward: { type: 'TOSS_POINT', amount: 1 },
        pendingTossPoints: 1,
      });
    });
  });
});
