import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  findByAnonKey(anonKey: string): Promise<User | null> {
    return this.repo.findOneBy({ anonKey });
  }

  /** anon_key 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨 */
  create(data: Pick<User, 'anonKey'>): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }
}
