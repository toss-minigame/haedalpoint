import type {
  TutorialCompleteResponse,
  TutorialRewardKind,
  TutorialRewardResponse,
  TutorialStatusResponse,
} from '@haedalpoint/shared';
import { Controller, Get, Param, ParseEnumPipe, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator.js';
import { TUTORIAL_REWARD_KINDS } from './lib/tutorial-status.js';
import { TutorialService } from './tutorial.service.js';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
@Controller('tutorial')
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  @Get('me')
  getStatus(@CurrentUserId() userId: string): Promise<TutorialStatusResponse> {
    return this.tutorialService.getStatus(userId);
  }

  // 튜토리얼 안에서만 부른다. 광고 없이 종류별로 한 번
  @Post('rewards/:kind')
  claimReward(
    @CurrentUserId() userId: string,
    @Param('kind', new ParseEnumPipe(TUTORIAL_REWARD_KINDS)) kind: TutorialRewardKind,
  ): Promise<TutorialRewardResponse> {
    return this.tutorialService.claimReward(userId, kind);
  }

  // 마지막 단계에서 광고를 보고 창고에 저장한 뒤에 부른다
  @Post('complete')
  complete(@CurrentUserId() userId: string): Promise<TutorialCompleteResponse> {
    return this.tutorialService.complete(userId);
  }

  @Post('skip')
  skip(@CurrentUserId() userId: string): Promise<TutorialStatusResponse> {
    return this.tutorialService.skip(userId);
  }
}
