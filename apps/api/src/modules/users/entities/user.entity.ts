import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

// 다른 모듈은 users.id(uuid)만 참조한다. 토스 식별자(anon_key)는 이 모듈 밖으로 내보내지 않는다.
@Entity('users')
@Unique('UQ_users_anon_key', ['anonKey'])
export class User extends BaseEntity {
  // 서버가 인증 코드 교환 API로 직접 받은 익명 사용자 식별 키 (ADR-0006)
  @Column({ type: 'text', name: 'anon_key' })
  anonKey: string;
}
