import type {
  AnswerQuizResponse,
  ClaimQuizRewardResponse,
  TodayQuizItem,
  TodayQuizResponse,
  UnlockQuizRetryResponse,
} from '@haedalpoint/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QUIZ_POLICY } from '../../common/globals';
import { isUniqueViolation } from '../../common/utils/is-unique-violation';
import { toKstDateString } from '../../common/utils/kst-date';
import { UsersService } from '../users/users.service';
import type { Quiz } from './entities/quiz.entity';
import type { QuizAttempt } from './entities/quiz-attempt.entity';
import { selectDailyQuizIds } from './lib/select-daily-quizzes';
import { type AttemptState, toAttemptResult } from './lib/to-attempt-result';
import { QuizRepository } from './quiz.repository';

const QUIZ_NOT_FOUND = '오늘의 퀴즈가 아닙니다';
const ALREADY_ANSWERED = '이미 답변한 퀴즈입니다';
const NOT_ANSWERED = '오늘 답변한 기록이 없습니다';
const ALREADY_SOLVED = '이미 정답을 맞힌 퀴즈입니다';
const RETRY_LOCKED = '광고를 보고 다시 도전할 수 있어요';
const RETRY_ALREADY_UNLOCKED = '이미 재도전 기회를 받았어요';
const NOT_CORRECT = '정답을 맞혀야 보상을 받을 수 있어요';
const ALREADY_CLAIMED = '이미 보상을 받은 퀴즈입니다';

// 비즈니스 로직 계층
// 사용자는 userId(users.id)로만 다룬다. 식별 방식(X-User-Id, 토스 로그인 등)은 @CurrentUserId 가 담당.
//
// ⚠️ 서버는 광고 시청 여부를 직접 검증할 수 없다. ad-retry·ad-reward 는 클라이언트가 SDK
// `userEarnedReward` 이벤트를 받은 뒤에만 호출해야 하며, `dismissed` 만으로 호출하면 안 된다.
// (docs/design/ox-quiz.md 9장)
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

  /** 첫 답변 또는 (재도전 기회를 연 뒤) 재답변 */
  async answer(userId: string, quizId: string, userAnswer: boolean): Promise<AnswerQuizResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());
    const quiz = await this.findTodayQuiz(today, quizId);
    const isCorrect = quiz.answer === userAnswer;

    const existing = await this.quizRepository.findAttempt(userId, today, quizId);
    const state = existing
      ? await this.reanswer(existing, userAnswer, isCorrect)
      : await this.firstAnswer(userId, today, quizId, userAnswer, isCorrect);

    return { quizId, ...toAttemptResult(state, quiz) };
  }

  /** 오답 후 광고 시청 완료 → 재도전 기회 열기 (맞힐 때까지 횟수 제한 없음) */
  async unlockRetry(userId: string, quizId: string): Promise<UnlockQuizRetryResponse> {
    await this.usersService.findById(userId);
    const attempt = await this.findTodayAttempt(userId, quizId);
    if (attempt.isCorrect) throw new ConflictException(ALREADY_SOLVED);
    if (attempt.retryUnlocked) throw new ConflictException(RETRY_ALREADY_UNLOCKED);

    const unlocked = await this.quizRepository.unlockRetry(attempt.id);
    if (!unlocked) throw new ConflictException(RETRY_ALREADY_UNLOCKED);

    return { quizId, status: 'RETRY_READY' };
  }

  /** 정답 후 광고 시청 완료 → 물고기 보상 기록 */
  async claimAdReward(userId: string, quizId: string): Promise<ClaimQuizRewardResponse> {
    await this.usersService.findById(userId);
    const attempt = await this.findTodayAttempt(userId, quizId);
    if (!attempt.isCorrect) throw new ConflictException(NOT_CORRECT);
    if (attempt.rewardClaimedAt) throw new ConflictException(ALREADY_CLAIMED);

    const rewardAmount = QUIZ_POLICY.REWARD_PER_QUIZ;
    const claimed = await this.quizRepository.claimReward(attempt.id, rewardAmount, new Date());
    if (!claimed) throw new ConflictException(ALREADY_CLAIMED);

    // TODO(fish-wallet): 물고기 지갑 모듈 생기면 여기서 적립 호출
    return { quizId, rewardAmount };
  }

  private async firstAnswer(
    userId: string,
    attemptedDate: string,
    quizId: string,
    userAnswer: boolean,
    isCorrect: boolean,
  ): Promise<AttemptState> {
    const wrongCount = isCorrect ? 0 : 1;
    try {
      // 조회 → insert 사이 레이스(연타)는 (user_id, attempted_date, quiz_id) 유니크 제약이 막는다
      await this.quizRepository.createAttempt({
        userId,
        attemptedDate,
        quizId,
        userAnswer,
        isCorrect,
        wrongCount,
      });
    } catch (error) {
      // 같은 퀴즈 첫 답변이 동시에 두 번 들어온 경우
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_ANSWERED);
      throw error;
    }
    return {
      userAnswer,
      isCorrect,
      wrongCount,
      retryUnlocked: false,
      rewardAmount: null,
      rewardClaimedAt: null,
    };
  }

  private async reanswer(
    attempt: QuizAttempt,
    userAnswer: boolean,
    isCorrect: boolean,
  ): Promise<AttemptState> {
    if (attempt.isCorrect) throw new ConflictException(ALREADY_SOLVED);
    if (!attempt.retryUnlocked) throw new ConflictException(RETRY_LOCKED);

    const updated = await this.quizRepository.reanswer(attempt.id, userAnswer, isCorrect);
    if (!updated) throw new ConflictException(RETRY_LOCKED);

    return {
      ...attempt,
      userAnswer,
      isCorrect,
      wrongCount: attempt.wrongCount + (isCorrect ? 0 : 1),
      retryUnlocked: false,
    };
  }

  private async findTodayQuizIds(today: string): Promise<string[]> {
    const activeIds = await this.quizRepository.findActiveQuizIds();
    return selectDailyQuizIds(today, activeIds, QUIZ_POLICY.DAILY_QUIZ_COUNT);
  }

  /** 하루 한도: 오늘 세트에 포함된 퀴즈만 도전 가능 */
  private async findTodayQuiz(today: string, quizId: string): Promise<Quiz> {
    const todayIds = await this.findTodayQuizIds(today);
    if (!todayIds.includes(quizId)) throw new NotFoundException(QUIZ_NOT_FOUND);

    const quiz = await this.quizRepository.findQuizById(quizId);
    if (!quiz) throw new NotFoundException(QUIZ_NOT_FOUND);
    return quiz;
  }

  private async findTodayAttempt(userId: string, quizId: string): Promise<QuizAttempt> {
    const today = toKstDateString(new Date());
    const attempt = await this.quizRepository.findAttempt(userId, today, quizId);
    if (!attempt) throw new NotFoundException(NOT_ANSWERED);
    return attempt;
  }
}
