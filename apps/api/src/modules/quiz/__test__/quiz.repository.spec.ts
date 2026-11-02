import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type EntityManager, In, IsNull } from 'typeorm';
import { Quiz } from '../entities/quiz.entity.js';
import { QuizAttempt } from '../entities/quiz-attempt.entity.js';
import { QuizRepository } from '../quiz.repository.js';

describe('QuizRepository', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  const TODAY = '2026-11-02';
  let repository: QuizRepository;
  const quizRepo = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
  };
  const attemptRepo = {
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizRepository,
        { provide: getRepositoryToken(Quiz), useValue: quizRepo },
        { provide: getRepositoryToken(QuizAttempt), useValue: attemptRepo },
      ],
    }).compile();
    repository = moduleRef.get(QuizRepository);
  });

  it('returns active quiz ids in a stable order', async () => {
    quizRepo.find.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);

    await expect(repository.findActiveQuizIds()).resolves.toEqual(['q1', 'q2']);
    expect(quizRepo.find).toHaveBeenCalledWith({
      select: { id: true },
      where: { active: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  });

  it('finds quizzes by ids', async () => {
    quizRepo.findBy.mockResolvedValue([]);

    await repository.findQuizzesByIds(['q1', 'q2']);

    expect(quizRepo.findBy).toHaveBeenCalledWith({ id: In(['q1', 'q2']) });
  });

  it('skips the query when no ids are given', async () => {
    await expect(repository.findQuizzesByIds([])).resolves.toEqual([]);
    expect(quizRepo.findBy).not.toHaveBeenCalled();
  });

  it('finds a quiz by id', async () => {
    quizRepo.findOneBy.mockResolvedValue(null);

    await repository.findQuizById('q1');

    expect(quizRepo.findOneBy).toHaveBeenCalledWith({ id: 'q1' });
  });

  it("finds a user's attempts on a date", async () => {
    attemptRepo.findBy.mockResolvedValue([]);

    await repository.findAttemptsByUserAndDate(USER_ID, TODAY);

    expect(attemptRepo.findBy).toHaveBeenCalledWith({ userId: USER_ID, attemptedDate: TODAY });
  });

  it('finds a single attempt', async () => {
    attemptRepo.findOneBy.mockResolvedValue(null);

    await repository.findAttempt(USER_ID, TODAY, 'q1');

    expect(attemptRepo.findOneBy).toHaveBeenCalledWith({
      userId: USER_ID,
      attemptedDate: TODAY,
      quizId: 'q1',
    });
  });

  it('creates and saves an attempt', async () => {
    const data = {
      userId: USER_ID,
      attemptedDate: TODAY,
      quizId: 'q1',
      userAnswer: true,
      isCorrect: true,
      wrongCount: 0,
    };
    attemptRepo.create.mockReturnValue(data);
    attemptRepo.save.mockResolvedValue({ id: 'attempt-1', ...data });

    await expect(repository.createAttempt(data)).resolves.toMatchObject({ id: 'attempt-1' });
    expect(attemptRepo.save).toHaveBeenCalledWith(data);
  });

  describe.each([
    [1, true],
    [0, false],
  ])('conditional updates (affected=%p → %p)', (affected, expected) => {
    beforeEach(() => {
      attemptRepo.update.mockResolvedValue({ affected });
    });

    it('claims a reward only when solved and unclaimed', async () => {
      const claimedAt = new Date('2026-11-02T03:00:00Z');

      await expect(repository.claimReward('attempt-1', claimedAt)).resolves.toBe(expected);
      expect(attemptRepo.update).toHaveBeenCalledWith(
        { id: 'attempt-1', isCorrect: true, rewardClaimedAt: IsNull() },
        { rewardClaimedAt: claimedAt },
      );
    });

    it("claims a reward inside the caller's transaction", async () => {
      const claimedAt = new Date('2026-11-02T03:00:00Z');
      const txAttemptRepo = { update: jest.fn().mockResolvedValue({ affected }) };
      const manager = { getRepository: jest.fn().mockReturnValue(txAttemptRepo) };

      await expect(
        repository.claimReward('attempt-1', claimedAt, manager as unknown as EntityManager),
      ).resolves.toBe(expected);
      expect(manager.getRepository).toHaveBeenCalledWith(QuizAttempt);
      expect(txAttemptRepo.update).toHaveBeenCalledWith(
        { id: 'attempt-1', isCorrect: true, rewardClaimedAt: IsNull() },
        { rewardClaimedAt: claimedAt },
      );
      expect(attemptRepo.update).not.toHaveBeenCalled();
    });

    it('unlocks a retry only when wrong and still locked', async () => {
      await expect(repository.unlockRetry('attempt-1')).resolves.toBe(expected);
      expect(attemptRepo.update).toHaveBeenCalledWith(
        { id: 'attempt-1', isCorrect: false, retryUnlocked: false },
        { retryUnlocked: true },
      );
    });

    it('re-answers only when wrong and unlocked, without bumping wrong_count when correct', async () => {
      await expect(repository.reanswer('attempt-1', true, true)).resolves.toBe(expected);
      expect(attemptRepo.update).toHaveBeenCalledWith(
        { id: 'attempt-1', isCorrect: false, retryUnlocked: true },
        { userAnswer: true, isCorrect: true, retryUnlocked: false },
      );
    });
  });

  it('increments wrong_count atomically when the retry is wrong again', async () => {
    attemptRepo.update.mockResolvedValue({ affected: 1 });

    await repository.reanswer('attempt-1', false, false);

    const [, values] = attemptRepo.update.mock.calls[0];
    expect(values).toMatchObject({ userAnswer: false, isCorrect: false, retryUnlocked: false });
    expect(values.wrongCount()).toBe('"wrong_count" + 1');
  });
});
