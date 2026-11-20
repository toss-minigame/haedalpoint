import { BadRequestException, ParseEnumPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EquipOutfitsDto } from '../dto/equip-outfits.dto.js';
import { OUTFIT_CODES } from '../lib/outfit-rules.js';
import { OutfitController } from '../outfit.controller.js';
import { OutfitService } from '../outfit.service.js';

describe('OutfitController', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let controller: OutfitController;
  const service = { getOutfits: jest.fn(), unlock: jest.fn(), equip: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [OutfitController],
      providers: [{ provide: OutfitService, useValue: service }],
    }).compile();
    controller = moduleRef.get(OutfitController);
  });

  it('getOutfits delegates with the user id', async () => {
    service.getOutfits.mockResolvedValue('result');

    await expect(controller.getOutfits(USER_ID)).resolves.toBe('result');
    expect(service.getOutfits).toHaveBeenCalledWith(USER_ID);
  });

  it('unlock delegates with the user id and the outfit code', async () => {
    service.unlock.mockResolvedValue('result');

    await expect(controller.unlock(USER_ID, 'straw_hat')).resolves.toBe('result');
    expect(service.unlock).toHaveBeenCalledWith(USER_ID, 'straw_hat');
  });

  it('equip delegates with the user id and the codes', async () => {
    service.equip.mockResolvedValue('result');

    await expect(controller.equip(USER_ID, { codes: ['sunglasses'] })).resolves.toBe('result');
    expect(service.equip).toHaveBeenCalledWith(USER_ID, ['sunglasses']);
  });

  it('accepts only the known outfit codes in the path', async () => {
    const pipe = new ParseEnumPipe(OUTFIT_CODES);
    const metadata = { type: 'param', data: 'code' } as const;

    await expect(pipe.transform('straw_hat', metadata)).resolves.toBe('straw_hat');
    await expect(pipe.transform('crown', metadata)).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('EquipOutfitsDto', () => {
    const errorsOf = (body: unknown) => validate(plainToInstance(EquipOutfitsDto, body));

    it('accepts known codes and an empty list', async () => {
      await expect(errorsOf({ codes: ['straw_hat', 'busan_tee'] })).resolves.toHaveLength(0);
      await expect(errorsOf({ codes: [] })).resolves.toHaveLength(0);
    });

    it('rejects unknown codes, duplicates and a missing list', async () => {
      await expect(errorsOf({ codes: ['crown'] })).resolves.not.toHaveLength(0);
      await expect(errorsOf({ codes: ['straw_hat', 'straw_hat'] })).resolves.not.toHaveLength(0);
      await expect(errorsOf({})).resolves.not.toHaveLength(0);
      await expect(errorsOf({ codes: 'straw_hat' })).resolves.not.toHaveLength(0);
    });
  });
});
