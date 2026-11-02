import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// users·quizzes 와 TypeORM 관계를 걸지 않고 id 컬럼으로만 참조 (모듈 경계 유지)
// 같은 퀴즈가 날짜를 바꿔 다시 출제될 수 있으므로 유니크 키에 attempted_date 를 포함한다.
// (user_id, attempted_date) 선두 컬럼으로 "오늘 내 답변 목록" 조회 인덱스 역할도 한다.
@Entity('quiz_attempts')
@Unique('UQ_quiz_attempts_user_id_attempted_date_quiz_id', ['userId', 'attemptedDate', 'quizId'])
export class QuizAttempt extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // KST 기준 'YYYY-MM-DD' (pg driver 는 date 를 문자열로 반환)
  @Column({ type: 'date', name: 'attempted_date' })
  attemptedDate: string;

  @Column({ type: 'uuid', name: 'quiz_id' })
  quizId: string;

  @Column({ type: 'boolean', name: 'user_answer' })
  userAnswer: boolean;

  @Column({ type: 'boolean', name: 'is_correct' })
  isCorrect: boolean;

  // 광고 시청 후 지급한 물고기 수 (TODO: 물고기 지갑 모듈 생기면 실제 적립과 연결)
  @Column({ type: 'int', name: 'reward_amount', nullable: true })
  rewardAmount: number | null;

  @Column({ type: 'timestamptz', name: 'reward_claimed_at', nullable: true })
  rewardClaimedAt: Date | null;
}
