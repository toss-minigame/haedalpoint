import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity.js';
import { QuizAttempt } from './entities/quiz-attempt.entity.js';

export type CreateQuizAttemptData = Pick<
  QuizAttempt,
  'userId' | 'attemptedDate' | 'quizId' | 'userAnswer' | 'isCorrect' | 'wrongCount'
>;

// 데이터 접근 계층: TypeORM 의존성은 이 계층 안에만 둡니다.
// 상태 변경은 모두 "현재 상태 조건부 UPDATE" 로 처리해 연타·동시 요청에도 한 번만 반영되게 한다.
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

  /** 첫 답변. (user_id, attempted_date, quiz_id) 유니크 위반 시 pg 에러(code 23505)가 그대로 전파됨 */
  createAttempt(data: CreateQuizAttemptData): Promise<QuizAttempt> {
    return this.attemptRepo.save(this.attemptRepo.create(data));
  }

  /**
   * 재답변: 오답이고 재도전 기회가 열린 상태에서만 반영하고 기회를 다시 닫는다.
   * @returns 반영됐으면 true
   */
  async reanswer(attemptId: string, userAnswer: boolean, isCorrect: boolean): Promise<boolean> {
    const result = await this.attemptRepo.update(
      { id: attemptId, isCorrect: false, retryUnlocked: true },
      {
        userAnswer,
        isCorrect,
        retryUnlocked: false,
        // 또 틀렸을 때만 DB 에서 원자적으로 +1
        ...(isCorrect ? {} : { wrongCount: () => '"wrong_count" + 1' }),
      },
    );
    return result.affected === 1;
  }

  /**
   * 재도전 기회 열기: 오답이고 아직 기회가 닫힌 상태에서만 반영한다.
   * @returns 반영됐으면 true
   */
  async unlockRetry(attemptId: string): Promise<boolean> {
    const result = await this.attemptRepo.update(
      { id: attemptId, isCorrect: false, retryUnlocked: false },
      { retryUnlocked: true },
    );
    return result.affected === 1;
  }

  /**
   * 보상 기록: 정답이고 아직 보상을 받지 않은 상태에서만 반영한다.
   * @returns 반영됐으면 true
   */
  async claimReward(attemptId: string, rewardAmount: number, claimedAt: Date): Promise<boolean> {
    const result = await this.attemptRepo.update(
      { id: attemptId, isCorrect: true, rewardClaimedAt: IsNull() },
      { rewardAmount, rewardClaimedAt: claimedAt },
    );
    return result.affected === 1;
  }
}
