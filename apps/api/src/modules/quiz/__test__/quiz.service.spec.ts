import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QUIZ_POLICY } from '../../../common/globals/index.js';
import { UsersService } from '../../users/users.service.js';
import { selectDailyQuizIds } from '../lib/select-daily-quizzes.js';
import { QuizRepository } from '../quiz.repository.js';
import { QuizService } from '../quiz.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
// KST 2026-11-02 12:00
const NOW = new Date('2026-11-02T03:00:00Z');
const TODAY = '2026-11-02';

const ACTIVE_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];
const TODAY_IDS = selectDailyQuizIds(TODAY, ACTIVE_IDS, QUIZ_POLICY.DAILY_QUIZ_COUNT);
const NOT_TODAY_ID = ACTIVE_IDS.find((id) => !TODAY_IDS.includes(id)) as string;
const [QUIZ_ID] = TODAY_IDS;

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
    wrongCount: 0,
    retryUnlocked: false,
    rewardAmount: null,
    rewardClaimedAt: null,
    ...overrides,
  };
}

const WRONG = { userAnswer: false, isCorrect: false, wrongCount: 1, retryUnlocked: false };
const RETRY_READY = { ...WRONG, retryUnlocked: true };

describe('QuizService', () => {
  let service: QuizService;
  const repo = {
    findActiveQuizIds: jest.fn(),
    findQuizzesByIds: jest.fn(),
    findQuizById: jest.fn(),
    findAttemptsByUserAndDate: jest.fn(),
    findAttempt: jest.fn(),
    createAttempt: jest.fn(),
    reanswer: jest.fn(),
    unlockRetry: jest.fn(),
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
    repo.findQuizById.mockResolvedValue(quiz(QUIZ_ID, true));
    repo.findAttempt.mockResolvedValue(null);
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

    it('reveals the answer only for solved quizzes', async () => {
      const [solved, wrong] = TODAY_IDS;
      repo.findQuizzesByIds.mockResolvedValue(TODAY_IDS.map((id) => quiz(id)));
      repo.findAttemptsByUserAndDate.mockResolvedValue([
        attempt(solved, { rewardAmount: 10, rewardClaimedAt: new Date() }),
        attempt(wrong, WRONG),
      ]);

      const { items } = await service.getToday(USER_ID);

      expect(items[0].attempt).toMatchObject({
        status: 'CORRECT',
        correctAnswer: true,
        explanation: `${solved} 해설`,
        rewardClaimed: true,
      });
      expect(items[1].attempt).toMatchObject({
        status: 'WRONG',
        correctAnswer: null,
        explanation: null,
      });
      expect(items[2].attempt).toBeNull();
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

  describe('answer — first attempt', () => {
    it('records a correct answer and reveals the answer', async () => {
      await expect(service.answer(USER_ID, QUIZ_ID, true)).resolves.toEqual({
        quizId: QUIZ_ID,
        status: 'CORRECT',
        userAnswer: true,
        isCorrect: true,
        wrongCount: 0,
        correctAnswer: true,
        explanation: `${QUIZ_ID} 해설`,
        rewardAmount: null,
        rewardClaimed: false,
      });
      expect(repo.createAttempt).toHaveBeenCalledWith({
        userId: USER_ID,
        attemptedDate: TODAY,
        quizId: QUIZ_ID,
        userAnswer: true,
        isCorrect: true,
        wrongCount: 0,
      });
    });

    it('records a wrong answer and hides the answer', async () => {
      await expect(service.answer(USER_ID, QUIZ_ID, false)).resolves.toEqual({
        quizId: QUIZ_ID,
        status: 'WRONG',
        userAnswer: false,
        isCorrect: false,
        wrongCount: 1,
        correctAnswer: null,
        explanation: null,
        rewardAmount: null,
        rewardClaimed: false,
      });
      expect(repo.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ isCorrect: false, wrongCount: 1 }),
      );
    });

    it("throws NotFoundException for a quiz outside today's set", async () => {
      await expect(service.answer(USER_ID, NOT_TODAY_ID, true)).rejects.toThrow(NotFoundException);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the quiz row is missing', async () => {
      repo.findQuizById.mockResolvedValue(null);

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toThrow(NotFoundException);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });

    it('converts a concurrent first answer (23505) into ConflictException', async () => {
      repo.createAttempt.mockRejectedValue(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toThrow(ConflictException);
    });

    it('rethrows other database errors', async () => {
      const dbError = Object.assign(new Error('connection lost'), { code: '08006' });
      repo.createAttempt.mockRejectedValue(dbError);

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toBe(dbError);
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toThrow(NotFoundException);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });
  });

  describe('answer — retry', () => {
    it('accepts a retry after the ad unlocked it and reveals the answer when correct', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, RETRY_READY));
      repo.reanswer.mockResolvedValue(true);

      await expect(service.answer(USER_ID, QUIZ_ID, true)).resolves.toMatchObject({
        status: 'CORRECT',
        isCorrect: true,
        wrongCount: 1,
        correctAnswer: true,
      });
      expect(repo.reanswer).toHaveBeenCalledWith(`attempt-${QUIZ_ID}`, true, true);
      expect(repo.createAttempt).not.toHaveBeenCalled();
    });

    it('locks the retry again when the retry is wrong too', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, RETRY_READY));
      repo.reanswer.mockResolvedValue(true);

      await expect(service.answer(USER_ID, QUIZ_ID, false)).resolves.toMatchObject({
        status: 'WRONG',
        wrongCount: 2,
        correctAnswer: null,
      });
    });

    it('throws ConflictException when the retry was not unlocked by an ad', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, WRONG));

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toThrow(ConflictException);
      expect(repo.reanswer).not.toHaveBeenCalled();
    });

    it('throws ConflictException when already solved', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID));

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toThrow(ConflictException);
      expect(repo.reanswer).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent retry consumed the chance first', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, RETRY_READY));
      repo.reanswer.mockResolvedValue(false);

      await expect(service.answer(USER_ID, QUIZ_ID, true)).rejects.toThrow(ConflictException);
    });
  });

  describe('unlockRetry', () => {
    it('unlocks a retry for a wrong answer', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, WRONG));
      repo.unlockRetry.mockResolvedValue(true);

      await expect(service.unlockRetry(USER_ID, QUIZ_ID)).resolves.toEqual({
        quizId: QUIZ_ID,
        status: 'RETRY_READY',
      });
      expect(repo.findAttempt).toHaveBeenCalledWith(USER_ID, TODAY, QUIZ_ID);
      expect(repo.unlockRetry).toHaveBeenCalledWith(`attempt-${QUIZ_ID}`);
    });

    it('throws NotFoundException when the quiz was not answered today', async () => {
      await expect(service.unlockRetry(USER_ID, QUIZ_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already solved', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID));

      await expect(service.unlockRetry(USER_ID, QUIZ_ID)).rejects.toThrow(ConflictException);
      expect(repo.unlockRetry).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the retry is already unlocked', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, RETRY_READY));

      await expect(service.unlockRetry(USER_ID, QUIZ_ID)).rejects.toThrow(ConflictException);
      expect(repo.unlockRetry).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request unlocked it first', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, WRONG));
      repo.unlockRetry.mockResolvedValue(false);

      await expect(service.unlockRetry(USER_ID, QUIZ_ID)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.unlockRetry(USER_ID, QUIZ_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('claimAdReward', () => {
    it('records the reward for a solved quiz', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID));
      repo.claimReward.mockResolvedValue(true);

      await expect(service.claimAdReward(USER_ID, QUIZ_ID)).resolves.toEqual({
        quizId: QUIZ_ID,
        rewardAmount: QUIZ_POLICY.REWARD_PER_QUIZ,
      });
      expect(repo.claimReward).toHaveBeenCalledWith(
        `attempt-${QUIZ_ID}`,
        QUIZ_POLICY.REWARD_PER_QUIZ,
        NOW,
      );
    });

    it('throws NotFoundException when the quiz was not answered today', async () => {
      await expect(service.claimAdReward(USER_ID, QUIZ_ID)).rejects.toThrow(NotFoundException);
      expect(repo.claimReward).not.toHaveBeenCalled();
    });

    it.each([
      ['wrong', WRONG],
      ['retry ready', RETRY_READY],
    ])('throws ConflictException when the quiz is not solved (%s)', async (_label, state) => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, state));

      await expect(service.claimAdReward(USER_ID, QUIZ_ID)).rejects.toThrow(ConflictException);
      expect(repo.claimReward).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the reward was already claimed', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID, { rewardClaimedAt: new Date() }));

      await expect(service.claimAdReward(USER_ID, QUIZ_ID)).rejects.toThrow(ConflictException);
      expect(repo.claimReward).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a concurrent request claimed it first', async () => {
      repo.findAttempt.mockResolvedValue(attempt(QUIZ_ID));
      repo.claimReward.mockResolvedValue(false);

      await expect(service.claimAdReward(USER_ID, QUIZ_ID)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an unknown user', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.claimAdReward(USER_ID, QUIZ_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
