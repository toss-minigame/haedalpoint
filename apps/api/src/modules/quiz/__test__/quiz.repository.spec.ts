import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import { Quiz } from '../entities/quiz.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { QuizRepository } from '../quiz.repository';

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
    };
    attemptRepo.create.mockReturnValue(data);
    attemptRepo.save.mockResolvedValue({ id: 'attempt-1', ...data });

    await expect(repository.createAttempt(data)).resolves.toMatchObject({ id: 'attempt-1' });
    expect(attemptRepo.save).toHaveBeenCalledWith(data);
  });

  it.each([
    [1, true],
    [0, false],
  ])('claims a reward only when unclaimed (affected=%p → %p)', async (affected, expected) => {
    const claimedAt = new Date('2026-11-02T03:00:00Z');
    attemptRepo.update.mockResolvedValue({ affected });

    await expect(repository.claimReward('attempt-1', 10, claimedAt)).resolves.toBe(expected);
    expect(attemptRepo.update).toHaveBeenCalledWith(
      { id: 'attempt-1', rewardClaimedAt: IsNull() },
      { rewardAmount: 10, rewardClaimedAt: claimedAt },
    );
  });
});
