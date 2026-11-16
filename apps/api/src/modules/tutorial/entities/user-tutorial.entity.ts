import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

// 사용자당 한 행 (docs/design/tutorial.md). users 와 TypeORM 관계를 걸지 않고 user_id 컬럼으로만 참조 (모듈 경계 유지)
// 처음 보상을 받거나 건너뛸 때 만든다. 보상은 종류별 시각이 비어 있을 때만 준다 (행 잠금으로 연타·동시 요청에도 한 번).
@Entity('user_tutorials')
@Unique('UQ_user_tutorials_user_id', ['userId'])
export class UserTutorial extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // 낚싯대 강화 체험 보상을 받은 시각
  @Column({ type: 'timestamptz', name: 'rod_rewarded_at', nullable: true })
  rodRewardedAt: Date | null;

  // 해먹 넓히기 체험 보상을 받은 시각
  @Column({ type: 'timestamptz', name: 'hammock_rewarded_at', nullable: true })
  hammockRewardedAt: Date | null;

  // 연습 퀴즈 보상을 받은 시각
  @Column({ type: 'timestamptz', name: 'quiz_rewarded_at', nullable: true })
  quizRewardedAt: Date | null;

  // 첫 선물(해먹 채우기)을 받은 시각
  @Column({ type: 'timestamptz', name: 'gift_rewarded_at', nullable: true })
  giftRewardedAt: Date | null;

  // 마친 시각 (완료 보상으로 해달 친구를 부른 시각)
  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  // 건너뛴 시각
  @Column({ type: 'timestamptz', name: 'skipped_at', nullable: true })
  skippedAt: Date | null;
}
