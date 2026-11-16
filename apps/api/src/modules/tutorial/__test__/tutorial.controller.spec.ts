import { BadRequestException, ParseEnumPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TUTORIAL_REWARD_KINDS } from '../lib/tutorial-status.js';
import { TutorialController } from '../tutorial.controller.js';
import { TutorialService } from '../tutorial.service.js';

describe('TutorialController', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let controller: TutorialController;
  const service = {
    getStatus: jest.fn(),
    claimReward: jest.fn(),
    complete: jest.fn(),
    skip: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TutorialController],
      providers: [{ provide: TutorialService, useValue: service }],
    }).compile();
    controller = moduleRef.get(TutorialController);
  });

  it.each([
    ['getStatus', 'getStatus'],
    ['complete', 'complete'],
    ['skip', 'skip'],
  ] as const)('%s delegates to service.%s with the user id', async (route, method) => {
    service[method].mockResolvedValue('result');

    await expect(controller[route](USER_ID)).resolves.toBe('result');
    expect(service[method]).toHaveBeenCalledWith(USER_ID);
  });

  it('claimReward delegates with the user id and the reward kind', async () => {
    service.claimReward.mockResolvedValue('result');

    await expect(controller.claimReward(USER_ID, 'GIFT')).resolves.toBe('result');
    expect(service.claimReward).toHaveBeenCalledWith(USER_ID, 'GIFT');
  });

  it('accepts only the known reward kinds in the path', async () => {
    const pipe = new ParseEnumPipe(TUTORIAL_REWARD_KINDS);
    const metadata = { type: 'param', data: 'kind' } as const;

    await expect(pipe.transform('ROD', metadata)).resolves.toBe('ROD');
    await expect(pipe.transform('rod', metadata)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform('FRIEND', metadata)).rejects.toBeInstanceOf(BadRequestException);
  });
});
