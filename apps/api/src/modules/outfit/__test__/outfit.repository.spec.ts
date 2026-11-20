import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type EntityManager, In, Not } from 'typeorm';
import { OtterOutfit } from '../entities/otter-outfit.entity.js';
import { OutfitRepository } from '../outfit.repository.js';

describe('OutfitRepository', () => {
  const USER_ID = '00000000-0000-4000-8000-000000000001';
  let repository: OutfitRepository;
  const typeormRepo = { find: jest.fn() };
  const txRepo = {
    find: jest.fn(),
    create: jest.fn((data: unknown) => data),
    insert: jest.fn(),
    update: jest.fn(),
  };
  const manager = { getRepository: jest.fn(() => txRepo) } as unknown as EntityManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OutfitRepository,
        { provide: getRepositoryToken(OtterOutfit), useValue: typeormRepo },
      ],
    }).compile();
    repository = moduleRef.get(OutfitRepository);
  });

  it('finds the outfits of the user in the order they were unlocked', async () => {
    typeormRepo.find.mockResolvedValue([]);

    await repository.findByUserId(USER_ID);

    expect(typeormRepo.find).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  });

  it('reads through the transaction manager when one is given', async () => {
    txRepo.find.mockResolvedValue([]);

    await repository.findByUserId(USER_ID, manager);

    expect(txRepo.find).toHaveBeenCalled();
    expect(typeormRepo.find).not.toHaveBeenCalled();
  });

  it('records an unlocked outfit', async () => {
    await repository.addOwned(manager, USER_ID, 'straw_hat');

    expect(txRepo.insert).toHaveBeenCalledWith({ userId: USER_ID, outfitCode: 'straw_hat' });
  });

  it('takes off the other outfits and puts on the given ones', async () => {
    await repository.setEquipped(manager, USER_ID, ['straw_hat', 'busan_tee']);

    expect(txRepo.update).toHaveBeenNthCalledWith(
      1,
      { userId: USER_ID, equipped: true, outfitCode: Not(In(['straw_hat', 'busan_tee'])) },
      { equipped: false },
    );
    expect(txRepo.update).toHaveBeenNthCalledWith(
      2,
      { userId: USER_ID, outfitCode: In(['straw_hat', 'busan_tee']) },
      { equipped: true },
    );
  });

  it('takes everything off with an empty list', async () => {
    await repository.setEquipped(manager, USER_ID, []);

    expect(txRepo.update).toHaveBeenCalledTimes(1);
    expect(txRepo.update).toHaveBeenCalledWith(
      { userId: USER_ID, equipped: true },
      { equipped: false },
    );
  });
});
