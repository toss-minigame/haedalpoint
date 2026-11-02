import { Test } from '@nestjs/testing';
import { AttendanceController } from '../attendance.controller';
import { AttendanceService } from '../attendance.service';

describe('AttendanceController', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let controller: AttendanceController;
  const service = {
    checkIn: jest.fn(),
    getStatus: jest.fn(),
    claimAdBonus: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [{ provide: AttendanceService, useValue: service }],
    }).compile();
    controller = moduleRef.get(AttendanceController);
  });

  it.each([
    ['checkIn', 'checkIn'],
    ['getStatus', 'getStatus'],
    ['claimAdBonus', 'claimAdBonus'],
  ] as const)('%s delegates to service.%s with the user id', async (route, method) => {
    service[method].mockResolvedValue('result');

    await expect(controller[route](USER_ID)).resolves.toBe('result');
    expect(service[method]).toHaveBeenCalledWith(USER_ID);
  });
});
