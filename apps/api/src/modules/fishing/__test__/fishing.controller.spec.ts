import { Test } from '@nestjs/testing';
import { FishingController } from '../fishing.controller.js';
import { FishingService } from '../fishing.service.js';

describe('FishingController', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let controller: FishingController;
  const service = { getStatus: jest.fn(), storeFish: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [FishingController],
      providers: [{ provide: FishingService, useValue: service }],
    }).compile();
    controller = moduleRef.get(FishingController);
  });

  it.each([
    ['getStatus', 'getStatus'],
    ['storeFish', 'storeFish'],
  ] as const)('%s delegates to service.%s with the user id', async (route, method) => {
    service[method].mockResolvedValue('result');

    await expect(controller[route](USER_ID)).resolves.toBe('result');
    expect(service[method]).toHaveBeenCalledWith(USER_ID);
  });
});
