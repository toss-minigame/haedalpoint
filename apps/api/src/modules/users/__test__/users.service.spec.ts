import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersRepository } from '../users.repository.js';
import { UsersService } from '../users.service.js';

const USER = { id: '00000000-0000-4000-8000-000000000001', anonKey: 'anon-1' };

describe('UsersService', () => {
  let service: UsersService;
  const repo = {
    findById: jest.fn(),
    findByAnonKey: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repo }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('findById', () => {
    it('throws NotFoundException for an unknown user', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById(USER.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreateByAnonKey', () => {
    it('returns the existing user without creating one', async () => {
      repo.findByAnonKey.mockResolvedValue(USER);

      await expect(service.findOrCreateByAnonKey('anon-1')).resolves.toBe(USER);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates a user on first sign-in', async () => {
      repo.findByAnonKey.mockResolvedValue(null);
      repo.create.mockResolvedValue(USER);

      await expect(service.findOrCreateByAnonKey('anon-1')).resolves.toBe(USER);
      expect(repo.create).toHaveBeenCalledWith({ anonKey: 'anon-1' });
    });

    it('returns the concurrently created user on a unique violation (23505)', async () => {
      repo.findByAnonKey.mockResolvedValueOnce(null).mockResolvedValueOnce(USER);
      repo.create.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }));

      await expect(service.findOrCreateByAnonKey('anon-1')).resolves.toBe(USER);
    });

    it('rethrows other database errors', async () => {
      repo.findByAnonKey.mockResolvedValue(null);
      repo.create.mockRejectedValue(new Error('connection lost'));

      await expect(service.findOrCreateByAnonKey('anon-1')).rejects.toThrow('connection lost');
    });
  });
});
