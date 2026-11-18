import type {
  TutorialCompleteResponse,
  TutorialRewardKind,
  TutorialRewardResponse,
  TutorialStatusResponse,
} from '@haedalpoint/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { TUTORIAL_REWARD_POLICY } from '../../common/globals/index.js';
import { FishingService } from '../fishing/fishing.service.js';
import { UsersService } from '../users/users.service.js';
import type { UserTutorial } from './entities/user-tutorial.entity.js';
import {
  buildTutorialStatus,
  canClaim,
  isClosed,
  isRewarded,
  REWARDED_AT_FIELD,
} from './lib/tutorial-status.js';
import { TutorialRepository } from './tutorial.repository.js';

const TUTORIAL_CLOSED = '이미 끝난 튜토리얼이에요';
const ALREADY_REWARDED = '이미 받은 보상이에요';
const GIFT_NOT_RECEIVED = '튜토리얼을 먼저 진행해 주세요';

// 비즈니스 로직 계층 (docs/design/tutorial.md)
// 보상은 모두 광고 없이 사용자당 한 번이다. 튜토리얼 행을 잠근 트랜잭션 안에서 낚시 보상까지 적용해,
// 보상 적용이 실패하면 받은 기록도 남지 않는다.
@Injectable()
export class TutorialService {
  constructor(
    private readonly tutorialRepository: TutorialRepository,
    private readonly usersService: UsersService,
    private readonly fishingService: FishingService,
    private readonly dataSource: DataSource,
  ) {}

  async getStatus(userId: string): Promise<TutorialStatusResponse> {
    await this.usersService.findById(userId);
    return buildTutorialStatus(await this.tutorialRepository.findByUserId(userId));
  }

  /** 체험 보상(낚싯대·양동이·퀴즈)과 첫 선물. 체험은 홈 튜토리얼을 마친 뒤 그 콘텐츠를 처음 누를 때 받는다. 응답은 받은 뒤의 낚시 현황 */
  async claimReward(userId: string, kind: TutorialRewardKind): Promise<TutorialRewardResponse> {
    await this.usersService.findById(userId);
    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const row = await this.tutorialRepository.lockOrCreate(manager, userId);
      if (!canClaim(row, kind)) throw new ConflictException(TUTORIAL_CLOSED);
      if (isRewarded(row, kind)) throw new ConflictException(ALREADY_REWARDED);

      await this.applyReward(userId, kind, manager, now);
      await this.tutorialRepository.update(manager, row.id, { [REWARDED_AT_FIELD[kind]]: now });
    });
    return this.fishingService.getStatus(userId);
  }

  /** 마치면 해달 친구가 와서 24시간 함께 낚시한다. 첫 선물을 받은 뒤에만 마칠 수 있다 */
  async complete(userId: string): Promise<TutorialCompleteResponse> {
    await this.usersService.findById(userId);
    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const row = await this.lockOpen(manager, userId);
      if (!isRewarded(row, 'GIFT')) throw new ConflictException(GIFT_NOT_RECEIVED);

      await this.fishingService.summonOtterFriend(userId, manager, now);
      await this.tutorialRepository.update(manager, row.id, { completedAt: now });
    });
    return this.fishingService.getStatus(userId);
  }

  /** 건너뛰면 다시 보여주지 않는다. 받은 보상은 그대로 두고, 이미 끝났으면 바꾸지 않는다 */
  async skip(userId: string): Promise<TutorialStatusResponse> {
    await this.usersService.findById(userId);
    const row = await this.dataSource.transaction(async (manager) => {
      const current = await this.tutorialRepository.lockOrCreate(manager, userId);
      if (isClosed(current)) return current;

      const skippedAt = new Date();
      await this.tutorialRepository.update(manager, current.id, { skippedAt });
      return { ...current, skippedAt };
    });
    return buildTutorialStatus(row);
  }

  /** 행을 잠그고, 마쳤거나 건너뛰었으면 409 */
  private async lockOpen(manager: EntityManager, userId: string): Promise<UserTutorial> {
    const row = await this.tutorialRepository.lockOrCreate(manager, userId);
    if (isClosed(row)) throw new ConflictException(TUTORIAL_CLOSED);
    return row;
  }

  private async applyReward(
    userId: string,
    kind: TutorialRewardKind,
    manager: EntityManager,
    now: Date,
  ): Promise<void> {
    switch (kind) {
      case 'ROD':
        await this.fishingService.enhanceRod(
          userId,
          TUTORIAL_REWARD_POLICY.ROD_LEVELS,
          manager,
          now,
        );
        return;
      case 'QUIZ':
        await this.fishingService.enhanceRod(
          userId,
          TUTORIAL_REWARD_POLICY.QUIZ_ROD_LEVELS,
          manager,
          now,
        );
        return;
      case 'HAMMOCK':
        await this.fishingService.expandHammock(userId, manager, now);
        return;
      case 'GIFT':
        await this.fishingService.fillHammock(
          userId,
          TUTORIAL_REWARD_POLICY.GIFT_MAX_FISH,
          manager,
          now,
        );
        return;
    }
  }
}
