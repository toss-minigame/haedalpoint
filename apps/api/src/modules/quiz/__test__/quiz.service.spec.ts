import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QUIZ_POLICY } from '../../../common/globals';
import { UsersService } from '../../users/users.service';
import { selectDailyQuizIds } from '../lib/select-daily-quizzes';
import { QuizRepository } from '../quiz.repository';
import { QuizService } from '../quiz.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
// KST 2026-11-02 12:00
const NOW = new Date('2026-11-02T03:00:00Z');
const TODAY = '2026-11-02';

const ACTIVE_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];
const TODAY_IDS = selectDailyQuizIds(TODAY, ACTIVE_IDS, QUIZ_POLICY.DAILY_QUIZ_COUNT);
const NOT_TODAY_ID = ACTIVE_IDS.find((id) => !TODAY_IDS.includes(id)) as string;

function quiz(id: string, answer = true) {
  return { id, question: `${id} 문제`, answer, explanation: `${id} 해설`, active: true };
}

function attempt(quizId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `attempt-${quizId}`,
    userId: USER_ID,
    attemptedDate: TODAY,
    quizId,
    userAnswer: true,
    isCorrect: true,
    rewardAmount: null,
    rewardClaimedAt: null,
    ...overrides,
  };
}

describe('QuizService', () => {
  let service: QuizService;
  const repo = {
    findActiveQuizIds: jest.fn(),
    findQuizzesByIds: jest.fn(),
    findQuizById: jest.fn(),
    findAttemptsByUserAndDate: jest.fn(),
    findAttempt: jest.fn(),
    createAttempt: jest.fn(),
    claimReward: jest.fn(),
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
    repo.findActiveQuizIds.mockResolvedValue(ACTIVE_IDS);
    repo.createAttempt.mockImplementation(async (data: object) => ({ id: 'attempt-1', ...data }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: QuizRepository, useValue: repo },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = moduleRef.get(QuizService);
  });

  describe('getToday', () => {
    it("returns today's quizzes in selection order with the reward per quiz", async () => {
      repo.findQuizzesByIds.mockResolvedValue([...TODAY_IDS].reverse().map((id) => quiz(id)));
      repo.findAttemptsByUserAndDate.mockResolvedValue([]);

      const result = await service.getToday(USER_ID);

      expect(repo.findQuizzesByIds).toHaveBeenCalledWith(TODAY_IDS);
      expect(repo.findAttemptsByUserAndDate).toHaveBeenCalledWith(USER_ID, TODAY);
      expect(result).toEqual({
        date: TODAY,
        rewardPerQuiz: QUIZ_POLICY.REWARD_PER_QUIZ,
        items: TODAY_IDS.map((id) => ({ quizId: id, question: `${id} 문제`, attempt: null })),
      });
    });

    it('does not expose the answer of unanswered quizzes', async () => {
      repo.findQuizzesByIds.mockResolvedValue(TODAY_IDS.map((id) => quiz(id)));
      repo.findAttemptsByUserAndDate.mockResolvedValue([]);

      const result = await service.getToday(USER_ID);

      for (const item of result.items) {
        expect(item).not.toHaveProperty('answer');
        expect(item.attempt).toBeNull();
      }
    });

    it('includes the result of answered quizzes', async () => {
      const [first] = TODAY_IDS;
      repo.findQuizzesByIds.mockResolvedValue(TODAY_IDS.map((id) => quiz(id, false)));
      repo.findAttemptsByUserAndDate.mockResolvedValue([
        attempt(first, {
          userAnswer: true,
          isCorrect: false,
          rewardAmount: 10,
          rewardClaimedAt: new Date(),
        }),
      ]);

      const result = await service.getToday(USER_ID);

      expect(result.items[0].attempt).toEqual({
        userAnswer: true,
        isCorrect: false,
        correctAnswer: false,
        explanation: `${first} 해설`,
        rewardAmount: 10,
        rewardClaimed: true,
      });
      expect(result.items[1].attempt).toBeNull();
    });

    it('returns no items when there is no active quiz', async () => {
      repo.findActiveQuizIds.mockResolvedValue([]);
      repo.findQuizzesByIds.mockResolvedValue([]);
      repo.findAttemptsByUserAndDate.mockResolvedValue([]);

      await expect(service.getToday(USER_ID)).resolves.toMatchObject({ items: [] });
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.getToday(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('answer', () => {
    const [quizId] = TODAY_IDS;

    it.each([
      [true, true, true],
      [false, true, false],
      [false, false, true],
    ])('answer=%p for correct=%p → isCorrect=%p', async (userAnswer, correct, isCorrect) => {
      repo.findQuizById.mockResolvedValue(quiz(quizId, correct));

      await expect(service.answer(USER_ID, quizId, userAnswer)).resolves.toEqual({
        quizId,
        userAnswer,
        isCorrect,
        correctAnswer: correct,
        explanation: `${quizId} 해설`,
        rewardAmount: null,
        rewardClaimed: false,
      });
      expect(repo.createAttempt).toHaveBeenCalledWith({
        userId: USER_ID,
        attemptedDate: TODAY,
        quizId,
        userAnswer,
        isCorrect,
      });
    });

    it("throws NotFoundException for a quiz outside today's set", async () => {
      await expect(service.answer(USER_ID, NOT_TODAY_ID, true)).rejects.toThrow(NotFoundException);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the quiz row is missing', async () => {
      repo.findQuizById.mockResolvedValue(null);

      await expect(service.answer(USER_ID, quizId, true)).rejects.toThrow(NotFoundException);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });

    it('converts a unique violation (23505) into ConflictException', async () => {
      repo.findQuizById.mockResolvedValue(quiz(quizId));
      repo.createAttempt.mockRejectedValue(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(service.answer(USER_ID, quizId, true)).rejects.toThrow(ConflictException);
    });

    it('rethrows other database errors', async () => {
      repo.findQuizById.mockResolvedValue(quiz(quizId));
      const dbError = Object.assign(new Error('connection lost'), { code: '08006' });
      repo.createAttempt.mockRejectedValue(dbError);

      await expect(service.answer(USER_ID, quizId, true)).rejects.toBe(dbError);
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.answer(USER_ID, quizId, true)).rejects.toThrow(NotFoundException);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });
  });

  describe('claimAdReward', () => {
    const [quizId] = TODAY_IDS;

    it('records the reward and returns the amount', async () => {
      repo.findAttempt.mockResolvedValue(attempt(quizId));
      repo.claimReward.mockResolvedValue(true);

      await expect(service.claimAdReward(USER_ID, quizId)).resolves.toEqual({
        quizId,
        rewardAmount: QUIZ_POLICY.REWARD_PER_QUIZ,
      });
      expect(repo.findAttempt).toHaveBeenCalledWith(USER_ID, TODAY, quizId);
      expect(repo.claimReward).toHaveBeenCalledWith(
        `attempt-${quizId}`,
        QUIZ_POLICY.REWARD_PER_QUIZ,
        NOW,
      );
    });

    it('throws NotFoundException when the quiz was not answered today', async () => {
      repo.findAttempt.mockResolvedValue(null);

      await expect(service.claimAdReward(USER_ID, quizId)).rejects.toThrow(NotFoundException);
      expect(repo.claimReward).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the reward was already claimed', async () => {
      repo.findAttempt.mockResolvedValue(attempt(quizId, { rewardClaimedAt: new Date() }));

      await expect(service.claimAdReward(USER_ID, quizId)).rejects.toThrow(ConflictException);
      expect(repo.claimReward).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request claimed it first', async () => {
      repo.findAttempt.mockResolvedValue(attempt(quizId));
      repo.claimReward.mockResolvedValue(false);

      await expect(service.claimAdReward(USER_ID, quizId)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.claimAdReward(USER_ID, quizId)).rejects.toThrow(NotFoundException);
    });
  });
});
