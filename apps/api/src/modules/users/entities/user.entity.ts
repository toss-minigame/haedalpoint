import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

// 다른 모듈은 users.id(uuid)만 참조한다. 토스 식별자(anon_key)는 프로모션 API 를 부르는 toss-point 모듈만 쓴다 (응답·로그에 넣지 않음).
@Entity('users')
@Unique('UQ_users_anon_key', ['anonKey'])
export class User extends BaseEntity {
  // 서버가 인증 코드 교환 API로 직접 받은 익명 사용자 식별 키 (ADR-0006)
  @Column({ type: 'text', name: 'anon_key' })
  anonKey: string;
}
