import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';

export type CreateQuizAttemptData = Pick<
  QuizAttempt,
  'userId' | 'attemptedDate' | 'quizId' | 'userAnswer' | 'isCorrect'
>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
@Injectable()
export class QuizRepository {
  constructor(
    @InjectRepository(Quiz) private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(QuizAttempt) private readonly attemptRepo: Repository<QuizAttempt>,
  ) {}

  /** 출제 대상 퀴즈 id. 오늘의 퀴즈 선택이 결정적이도록 순서를 고정한다. */
  async findActiveQuizIds(): Promise<string[]> {
    const quizzes = await this.quizRepo.find({
      select: { id: true },
      where: { active: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return quizzes.map((quiz) => quiz.id);
  }

  findQuizzesByIds(ids: readonly string[]): Promise<Quiz[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.quizRepo.findBy({ id: In([...ids]) });
  }

  findQuizById(id: string): Promise<Quiz | null> {
    return this.quizRepo.findOneBy({ id });
  }

  findAttemptsByUserAndDate(userId: string, attemptedDate: string): Promise<QuizAttempt[]> {
    return this.attemptRepo.findBy({ userId, attemptedDate });
  }

  findAttempt(userId: string, attemptedDate: string, quizId: string): Promise<QuizAttempt | null> {
    return this.attemptRepo.findOneBy({ userId, attemptedDate, quizId });
  }

  /** (user_id, attempted_date, quiz_id) 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨 */
  createAttempt(data: CreateQuizAttemptData): Promise<QuizAttempt> {
    return this.attemptRepo.save(this.attemptRepo.create(data));
  }

  /**
   * 아직 보상을 받지 않은 경우에만 보상을 기록한다 (조건부 UPDATE).
   * 동시에 두 번 요청돼도 한 번만 성공한다.
   * @returns 이번 요청으로 기록됐으면 true, 이미 받은 상태였으면 false
   */
  async claimReward(attemptId: string, rewardAmount: number, claimedAt: Date): Promise<boolean> {
    const result = await this.attemptRepo.update(
      { id: attemptId, rewardClaimedAt: IsNull() },
      { rewardAmount, rewardClaimedAt: claimedAt },
    );
    return result.affected === 1;
  }
}
