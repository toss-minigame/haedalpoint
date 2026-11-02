import type {
  AnswerQuizResponse,
  ClaimQuizRewardResponse,
  QuizAttemptResult,
  TodayQuizItem,
  TodayQuizResponse,
} from '@haedalpoint/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QUIZ_POLICY } from '../../common/globals';
import { isUniqueViolation } from '../../common/utils/is-unique-violation';
import { toKstDateString } from '../../common/utils/kst-date';
import { UsersService } from '../users/users.service';
import type { Quiz } from './entities/quiz.entity';
import type { QuizAttempt } from './entities/quiz-attempt.entity';
import { selectDailyQuizIds } from './lib/select-daily-quizzes';
import { QuizRepository } from './quiz.repository';

const QUIZ_NOT_FOUND = '오늘의 퀴즈가 아닙니다';
const ALREADY_ANSWERED = '이미 답변한 퀴즈입니다';
const NOT_ANSWERED = '오늘 답변한 기록이 없습니다';
const ALREADY_CLAIMED = '이미 보상을 받은 퀴즈입니다';

/**
 * 답변한 퀴즈에 대해서만 정답·해설을 노출한다.
 * insert 직후 save() 결과에는 값을 넣지 않은 nullable 컬럼이 undefined 로 남으므로 null 과 함께 처리한다.
 */
function toAttemptResult(attempt: QuizAttempt, quiz: Quiz): QuizAttemptResult {
  return {
    userAnswer: attempt.userAnswer,
    isCorrect: attempt.isCorrect,
    correctAnswer: quiz.answer,
    explanation: quiz.explanation ?? null,
    rewardAmount: attempt.rewardAmount ?? null,
    rewardClaimed: attempt.rewardClaimedAt != null,
  };
}

// 비즈니스 로직 계층
// 사용자는 userId(users.id)로만 다룬다. 식별 방식(X-User-Id, 토스 로그인 등)은 @CurrentUserId 가 담당.
@Injectable()
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly usersService: UsersService,
  ) {}

  async getToday(userId: string): Promise<TodayQuizResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());

    const todayIds = await this.findTodayQuizIds(today);
    const [quizzes, attempts] = await Promise.all([
      this.quizRepository.findQuizzesByIds(todayIds),
      this.quizRepository.findAttemptsByUserAndDate(userId, today),
    ]);

    const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
    const attemptByQuizId = new Map(attempts.map((attempt) => [attempt.quizId, attempt]));

    const items = todayIds.flatMap((quizId): TodayQuizItem[] => {
      const quiz = quizById.get(quizId);
      if (!quiz) return [];
      const attempt = attemptByQuizId.get(quizId);
      return [
        {
          quizId,
          question: quiz.question,
          attempt: attempt ? toAttemptResult(attempt, quiz) : null,
        },
      ];
    });

    return { date: today, items, rewardPerQuiz: QUIZ_POLICY.REWARD_PER_QUIZ };
  }

  async answer(userId: string, quizId: string, userAnswer: boolean): Promise<AnswerQuizResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());

    // 하루 한도: 오늘 세트에 포함된 퀴즈만 답변 가능 + 유니크 제약으로 퀴즈당 1회
    const todayIds = await this.findTodayQuizIds(today);
    if (!todayIds.includes(quizId)) throw new NotFoundException(QUIZ_NOT_FOUND);

    const quiz = await this.quizRepository.findQuizById(quizId);
    if (!quiz) throw new NotFoundException(QUIZ_NOT_FOUND);

    const isCorrect = quiz.answer === userAnswer;
    try {
      // 조회 → insert 사이 레이스(연타)는 (user_id, attempted_date, quiz_id) 유니크 제약이 막는다
      const attempt = await this.quizRepository.createAttempt({
        userId,
        attemptedDate: today,
        quizId,
        userAnswer,
        isCorrect,
      });
      return { quizId, ...toAttemptResult(attempt, quiz) };
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_ANSWERED);
      throw error;
    }
  }

  /**
   * 보상형 광고 시청 완료 후 물고기 보상 기록.
   * ⚠️ 서버는 광고 시청 여부를 직접 검증할 수 없다. 클라이언트는 SDK `userEarnedReward` 이벤트를
   * 받은 뒤에만 호출해야 하며, `dismissed` 만으로 호출하면 안 된다. (docs/design/ox-quiz.md 9장)
   */
  async claimAdReward(userId: string, quizId: string): Promise<ClaimQuizRewardResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());

    const attempt = await this.quizRepository.findAttempt(userId, today, quizId);
    if (!attempt) throw new NotFoundException(NOT_ANSWERED);
    if (attempt.rewardClaimedAt) throw new ConflictException(ALREADY_CLAIMED);

    const rewardAmount = QUIZ_POLICY.REWARD_PER_QUIZ;
    const claimed = await this.quizRepository.claimReward(attempt.id, rewardAmount, new Date());
    if (!claimed) throw new ConflictException(ALREADY_CLAIMED);

    // TODO(fish-wallet): 물고기 지갑 모듈 생기면 여기서 적립 호출
    return { quizId, rewardAmount };
  }

  private async findTodayQuizIds(today: string): Promise<string[]> {
    const activeIds = await this.quizRepository.findActiveQuizIds();
    return selectDailyQuizIds(today, activeIds, QUIZ_POLICY.DAILY_QUIZ_COUNT);
  }
}
