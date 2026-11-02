import { Test } from '@nestjs/testing';
import { QuizController } from '../quiz.controller';
import { QuizService } from '../quiz.service';

describe('QuizController', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  const QUIZ_ID = '32f71097-7138-4e1b-8c40-3f1202de7c88';
  let controller: QuizController;
  const service = {
    getToday: jest.fn(),
    answer: jest.fn(),
    unlockRetry: jest.fn(),
    claimAdReward: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [{ provide: QuizService, useValue: service }],
    }).compile();
    controller = moduleRef.get(QuizController);
  });

  it('getToday delegates with the user id', async () => {
    service.getToday.mockResolvedValue('result');

    await expect(controller.getToday(USER_ID)).resolves.toBe('result');
    expect(service.getToday).toHaveBeenCalledWith(USER_ID);
  });

  it('answer delegates with the user id, quiz id and answer', async () => {
    service.answer.mockResolvedValue('result');

    await expect(controller.answer(USER_ID, QUIZ_ID, { answer: false })).resolves.toBe('result');
    expect(service.answer).toHaveBeenCalledWith(USER_ID, QUIZ_ID, false);
  });

  it('unlockRetry delegates with the user id and quiz id', async () => {
    service.unlockRetry.mockResolvedValue('result');

    await expect(controller.unlockRetry(USER_ID, QUIZ_ID)).resolves.toBe('result');
    expect(service.unlockRetry).toHaveBeenCalledWith(USER_ID, QUIZ_ID);
  });

  it('claimAdReward delegates with the user id and quiz id', async () => {
    service.claimAdReward.mockResolvedValue('result');

    await expect(controller.claimAdReward(USER_ID, QUIZ_ID)).resolves.toBe('result');
    expect(service.claimAdReward).toHaveBeenCalledWith(USER_ID, QUIZ_ID);
  });
});
