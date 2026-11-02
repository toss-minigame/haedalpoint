import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { FishingState } from '../entities/fishing-state.entity.js';
import { WarehouseLedger } from '../entities/warehouse-ledger.entity.js';
import { FishingRepository } from '../fishing.repository.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-11-02T03:00:00Z');

function mockManager() {
  const insertBuilder = {
    insert: jest.fn(),
    into: jest.fn(),
    values: jest.fn(),
    orIgnore: jest.fn(),
    execute: jest.fn(),
  };
  insertBuilder.insert.mockReturnValue(insertBuilder);
  insertBuilder.into.mockReturnValue(insertBuilder);
  insertBuilder.values.mockReturnValue(insertBuilder);
  insertBuilder.orIgnore.mockReturnValue(insertBuilder);
  insertBuilder.execute.mockResolvedValue({});

  const stateRepo = { findOneOrFail: jest.fn(), update: jest.fn() };
  const ledgerRepo = { create: jest.fn((data: object) => data), insert: jest.fn() };
  const manager = {
    createQueryBuilder: jest.fn(() => insertBuilder),
    getRepository: jest.fn((entity: unknown) => (entity === FishingState ? stateRepo : ledgerRepo)),
  };
  return { manager, insertBuilder, stateRepo, ledgerRepo };
}

describe('FishingRepository', () => {
  let repository: FishingRepository;
  let mocks: ReturnType<typeof mockManager>;
  const typeormRepo = { findOneByOrFail: jest.fn(), manager: {} as unknown };

  beforeEach(async () => {
    jest.resetAllMocks();
    mocks = mockManager();
    typeormRepo.manager = mocks.manager;
    const moduleRef = await Test.createTestingModule({
      providers: [
        FishingRepository,
        { provide: getRepositoryToken(FishingState), useValue: typeormRepo },
      ],
    }).compile();
    repository = moduleRef.get(FishingRepository);
  });

  it('creates the row on first access and returns it', async () => {
    const row = { id: 'state-1' };
    typeormRepo.findOneByOrFail.mockResolvedValue(row);

    await expect(repository.findOrCreate(USER_ID, NOW)).resolves.toBe(row);
    expect(mocks.insertBuilder.into).toHaveBeenCalledWith(FishingState);
    expect(mocks.insertBuilder.values).toHaveBeenCalledWith({ userId: USER_ID, settledAt: NOW });
    expect(mocks.insertBuilder.orIgnore).toHaveBeenCalled();
    expect(typeormRepo.findOneByOrFail).toHaveBeenCalledWith({ userId: USER_ID });
  });

  it('locks the row inside the given transaction', async () => {
    const row = { id: 'state-1' };
    mocks.stateRepo.findOneOrFail.mockResolvedValue(row);
    const manager = mocks.manager as unknown as EntityManager;

    await expect(repository.lockOrCreate(manager, USER_ID, NOW)).resolves.toBe(row);
    expect(mocks.insertBuilder.orIgnore).toHaveBeenCalled();
    expect(mocks.stateRepo.findOneOrFail).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('updates the state by id', async () => {
    const manager = mocks.manager as unknown as EntityManager;
    const changes = { hammockMilliFish: 10, settledAt: NOW };

    await repository.updateState(manager, 'state-1', changes);

    expect(mocks.stateRepo.update).toHaveBeenCalledWith({ id: 'state-1' }, changes);
  });

  it('appends a warehouse ledger entry', async () => {
    const manager = mocks.manager as unknown as EntityManager;
    const entry = { userId: USER_ID, type: 'STORE' as const, amount: 42 };

    await repository.addLedgerEntry(manager, entry);

    expect(mocks.manager.getRepository).toHaveBeenCalledWith(WarehouseLedger);
    expect(mocks.ledgerRepo.insert).toHaveBeenCalledWith(entry);
  });
});
