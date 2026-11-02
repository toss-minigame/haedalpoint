import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export const QUIZ_QUESTION_MAX_LENGTH = 200;
export const QUIZ_EXPLANATION_MAX_LENGTH = 500;

@Entity('quizzes')
export class Quiz extends BaseEntity {
  @Column({ type: 'varchar', length: QUIZ_QUESTION_MAX_LENGTH })
  question: string;

  // true = O, false = X
  @Column({ type: 'boolean' })
  answer: boolean;

  @Column({ type: 'varchar', length: QUIZ_EXPLANATION_MAX_LENGTH, nullable: true })
  explanation: string | null;

  // false 면 오늘의 퀴즈 출제 대상에서 빠진다
  @Column({ type: 'boolean', default: true })
  active: boolean;
}
