import type {
  AnswerQuizResponse,
  ClaimQuizRewardResponse,
  TodayQuizResponse,
  UnlockQuizRetryResponse,
} from '@haedalpoint/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { QuizService } from './quiz.service';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
// 사용자는 @CurrentUserId() 로만 받는다 (운영용 식별 도입 시 데코레이터만 교체)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('today')
  getToday(@CurrentUserId() userId: string): Promise<TodayQuizResponse> {
    return this.quizService.getToday(userId);
  }

  @Post(':quizId/answer')
  answer(
    @CurrentUserId() userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: AnswerQuizDto,
  ): Promise<AnswerQuizResponse> {
    return this.quizService.answer(userId, quizId, dto.answer);
  }

  // 오답 후 광고 시청 완료 (`userEarnedReward` 수신 후에만 호출)
  @Post(':quizId/ad-retry')
  unlockRetry(
    @CurrentUserId() userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ): Promise<UnlockQuizRetryResponse> {
    return this.quizService.unlockRetry(userId, quizId);
  }

  // 정답 후 광고 시청 완료 (`userEarnedReward` 수신 후에만 호출)
  @Post(':quizId/ad-reward')
  claimAdReward(
    @CurrentUserId() userId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
  ): Promise<ClaimQuizRewardResponse> {
    return this.quizService.claimAdReward(userId, quizId);
  }
}
