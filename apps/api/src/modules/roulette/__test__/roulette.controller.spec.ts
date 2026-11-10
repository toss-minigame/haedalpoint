import { Test } from '@nestjs/testing';
import { RouletteController } from '../roulette.controller.js';
import { RouletteService } from '../roulette.service.js';

describe('RouletteController', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let controller: RouletteController;
  const service = { getToday: jest.fn(), spin: jest.fn(), applyAdBait: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [RouletteController],
      providers: [{ provide: RouletteService, useValue: service }],
    }).compile();
    controller = moduleRef.get(RouletteController);
  });

  it.each([
    ['getToday', 'getToday'],
    ['spin', 'spin'],
    ['applyAdBait', 'applyAdBait'],
  ] as const)('%s delegates to service.%s with the user id', async (route, method) => {
    service[method].mockResolvedValue('result');

    await expect(controller[route](USER_ID)).resolves.toBe('result');
    expect(service[method]).toHaveBeenCalledWith(USER_ID);
  });
});
