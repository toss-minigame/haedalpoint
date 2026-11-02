import { Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../../common/utils/is-unique-violation.js';
import { User } from './entities/user.entity.js';
import { UsersRepository } from './users.repository.js';

// 비즈니스 로직 계층
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  /** 익명키로 회원을 찾고, 처음 들어온 사용자면 만든다 */
  async findOrCreateByAnonKey(anonKey: string): Promise<User> {
    const existing = await this.usersRepository.findByAnonKey(anonKey);
    if (existing) return existing;

    try {
      return await this.usersRepository.create({ anonKey });
    } catch (error) {
      // 같은 사용자의 첫 요청이 동시에 들어와 다른 쪽이 먼저 만든 경우
      if (!isUniqueViolation(error)) throw error;
      const created = await this.usersRepository.findByAnonKey(anonKey);
      if (!created) throw error;
      return created;
    }
  }
}
