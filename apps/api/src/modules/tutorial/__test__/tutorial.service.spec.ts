import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, type EntityManager } from 'typeorm';
import { TUTORIAL_REWARD_POLICY } from '../../../common/globals/index.js';
import { FishingService } from '../../fishing/fishing.service.js';
import { UsersService } from '../../users/users.service.js';
import { TutorialRepository } from '../tutorial.repository.js';
import { TutorialService } from '../tutorial.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
// KST 2026-11-16 12:00
const NOW = new Date('2026-11-16T03:00:00Z');
const EARLIER = new Date('2026-11-16T02:00:00Z');
const FISHING_STATUS = { otterFriendActive: true };

function tutorialRow(overrides: Record<string, Date | null> = {}) {
  return {
    id: 'tutorial-1',
    userId: USER_ID,
    rodRewardedAt: null,
    hammockRewardedAt: null,
    quizRewardedAt: null,
    giftRewardedAt: null,
    completedAt: null,
    skippedAt: null,
    ...overrides,
  };
}

describe('TutorialService', () => {
  let service: TutorialService;
  const repo = { findByUserId: jest.fn(), lockOrCreate: jest.fn(), update: jest.fn() };
  const usersService = { findById: jest.fn() };
  const manager = { name: 'tx-manager' } as unknown as EntityManager;
  const fishingService = {
    getStatus: jest.fn(),
    enhanceRod: jest.fn(),
    expandHammock: jest.fn(),
    fillHammock: jest.fn(),
    summonOtterFriend: jest.fn(),
  };
  const dataSource = { transaction: jest.fn() };

  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    usersService.findById.mockResolvedValue({ id: USER_ID });
    fishingService.getStatus.mockResolvedValue(FISHING_STATUS);
    dataSource.transaction.mockImplementation(async (work: (m: EntityManager) => unknown) =>
      work(manager),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        TutorialService,
        { provide: TutorialRepository, useValue: repo },
        { provide: UsersService, useValue: usersService },
        { provide: FishingService, useValue: fishingService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(TutorialService);
  });

  describe('getStatus', () => {
    it('is NOT_STARTED for a user without a tutorial row', async () => {
      repo.findByUserId.mockResolvedValue(null);

      await expect(service.getStatus(USER_ID)).resolves.toMatchObject({ status: 'NOT_STARTED' });
      expect(repo.findByUserId).toHaveBeenCalledWith(USER_ID);
    });

    it('rejects an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getStatus(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('claimReward', () => {
    it.each([
      ['ROD', 'rodRewardedAt'],
      ['QUIZ', 'quizRewardedAt'],
    ] as const)(
      '%s raises the rod and records the reward in one transaction',
      async (kind, field) => {
        repo.lockOrCreate.mockResolvedValue(tutorialRow());

        await expect(service.claimReward(USER_ID, kind)).resolves.toBe(FISHING_STATUS);

        expect(dataSource.transaction).toHaveBeenCalledTimes(1);
        expect(repo.lockOrCreate).toHaveBeenCalledWith(manager, USER_ID);
        const levels =
          kind === 'ROD'
            ? TUTORIAL_REWARD_POLICY.ROD_LEVELS
            : TUTORIAL_REWARD_POLICY.QUIZ_ROD_LEVELS;
        expect(fishingService.enhanceRod).toHaveBeenCalledWith(USER_ID, levels, manager, NOW);
        expect(repo.update).toHaveBeenCalledWith(manager, 'tutorial-1', { [field]: NOW });
      },
    );

    it('HAMMOCK expands the hammock without the ad cooldown', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow());

      await service.claimReward(USER_ID, 'HAMMOCK');

      expect(fishingService.expandHammock).toHaveBeenCalledWith(USER_ID, manager, NOW);
      expect(repo.update).toHaveBeenCalledWith(manager, 'tutorial-1', { hammockRewardedAt: NOW });
    });

    it('GIFT fills the hammock up to the max gift', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow());

      await service.claimReward(USER_ID, 'GIFT');

      expect(fishingService.fillHammock).toHaveBeenCalledWith(
        USER_ID,
        TUTORIAL_REWARD_POLICY.GIFT_MAX_FISH,
        manager,
        NOW,
      );
      expect(repo.update).toHaveBeenCalledWith(manager, 'tutorial-1', { giftRewardedAt: NOW });
    });

    it('gives each reward only once (409)', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow({ rodRewardedAt: EARLIER }));

      await expect(service.claimReward(USER_ID, 'ROD')).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.enhanceRod).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it.each([
      ['completed', { completedAt: EARLIER }],
      ['skipped', { skippedAt: EARLIER }],
    ])('rejects the home rewards once the tutorial is %s (409)', async (_label, overrides) => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow(overrides));

      await expect(service.claimReward(USER_ID, 'ROD')).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.enhanceRod).not.toHaveBeenCalled();
    });

    it('gives the practice quiz reward after the home tutorial is completed', async () => {
      repo.lockOrCreate.mockResolvedValue(
        tutorialRow({ giftRewardedAt: EARLIER, completedAt: EARLIER }),
      );

      await service.claimReward(USER_ID, 'QUIZ');

      expect(fishingService.enhanceRod).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(manager, 'tutorial-1', { quizRewardedAt: NOW });
    });

    it('rejects the practice quiz reward once the tutorial is skipped (409)', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow({ skippedAt: EARLIER }));

      await expect(service.claimReward(USER_ID, 'QUIZ')).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.enhanceRod).not.toHaveBeenCalled();
    });

    it('does not record the reward when applying it fails', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow());
      fishingService.expandHammock.mockRejectedValue(new Error('db down'));

      await expect(service.claimReward(USER_ID, 'HAMMOCK')).rejects.toThrow('db down');
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('summons an otter friend and records the completion after the gift', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow({ giftRewardedAt: EARLIER }));

      await expect(service.complete(USER_ID)).resolves.toBe(FISHING_STATUS);

      expect(fishingService.summonOtterFriend).toHaveBeenCalledWith(USER_ID, manager, NOW);
      expect(repo.update).toHaveBeenCalledWith(manager, 'tutorial-1', { completedAt: NOW });
    });

    it('rejects completing before the gift (409)', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow());

      await expect(service.complete(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.summonOtterFriend).not.toHaveBeenCalled();
    });

    it('completes only once (409)', async () => {
      repo.lockOrCreate.mockResolvedValue(
        tutorialRow({ giftRewardedAt: EARLIER, completedAt: EARLIER }),
      );

      await expect(service.complete(USER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(fishingService.summonOtterFriend).not.toHaveBeenCalled();
    });
  });

  describe('skip', () => {
    it('records the skip and keeps the claimed rewards', async () => {
      repo.lockOrCreate.mockResolvedValue(tutorialRow({ rodRewardedAt: EARLIER }));

      await expect(service.skip(USER_ID)).resolves.toEqual({
        status: 'SKIPPED',
        claimed: { ROD: true, HAMMOCK: false, QUIZ: false, GIFT: false },
      });
      expect(repo.update).toHaveBeenCalledWith(manager, 'tutorial-1', { skippedAt: NOW });
    });

    it('leaves a completed tutorial as it is', async () => {
      repo.lockOrCreate.mockResolvedValue(
        tutorialRow({ giftRewardedAt: EARLIER, completedAt: EARLIER }),
      );

      await expect(service.skip(USER_ID)).resolves.toMatchObject({ status: 'DONE' });
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
