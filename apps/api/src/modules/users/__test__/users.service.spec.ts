import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersRepository } from '../users.repository';
import { UsersService } from '../users.service';

describe('UsersService', () => {
  let service: UsersService;
  const repo = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repo }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('creates a user when email is not taken', async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue({ id: '1', email: 'a@b.com', name: 'A' });

    await expect(service.create({ email: 'a@b.com', name: 'A' })).resolves.toMatchObject({
      id: '1',
    });
  });

  it('throws ConflictException when email exists', async () => {
    repo.findByEmail.mockResolvedValue({ id: '1' });

    await expect(service.create({ email: 'a@b.com', name: 'A' })).rejects.toThrow(
      ConflictException,
    );
  });
});
