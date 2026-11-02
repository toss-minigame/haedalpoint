import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// users·quizzes 와 TypeORM 관계를 걸지 않고 id 컬럼으로만 참조 (모듈 경계 유지)
// 같은 퀴즈가 날짜를 바꿔 다시 출제될 수 있으므로 유니크 키에 attempted_date 를 포함한다.
// (user_id, attempted_date) 선두 컬럼으로 "오늘 내 답변 목록" 조회 인덱스 역할도 한다.
//
// 한 행 = 사용자가 그날 한 퀴즈에 도전한 기록. 재도전하면 같은 행을 갱신한다.
//   오답 → (광고 시청) retry_unlocked = true → 재답변 → 정답이 될 때까지 반복
//   정답 → (광고 시청) reward_claimed_at 기록
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

  // 마지막 답변
  @Column({ type: 'boolean', name: 'user_answer' })
  userAnswer: boolean;

  // 마지막 답변의 정답 여부 (true 가 되면 더 이상 답변 불가)
  @Column({ type: 'boolean', name: 'is_correct' })
  isCorrect: boolean;

  // 틀린 횟수 (재도전 광고 노출 분석용)
  @Column({ type: 'int', name: 'wrong_count', default: 0 })
  wrongCount: number;

  // 오답 후 광고를 보고 재도전 기회를 얻었는지. 재답변하면 다시 false.
  @Column({ type: 'boolean', name: 'retry_unlocked', default: false })
  retryUnlocked: boolean;

  // 정답 후 광고 시청으로 지급한 물고기 수 (TODO: 물고기 지갑 모듈 생기면 실제 적립과 연결)
  @Column({ type: 'int', name: 'reward_amount', nullable: true })
  rewardAmount: number | null;

  @Column({ type: 'timestamptz', name: 'reward_claimed_at', nullable: true })
  rewardClaimedAt: Date | null;
}
