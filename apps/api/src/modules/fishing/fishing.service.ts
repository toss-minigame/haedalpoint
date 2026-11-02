import type { FishingStatusResponse, StoreFishResponse } from '@haedalpoint/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { toKstDateString } from '../../common/utils/kst-date.js';
import { UsersService } from '../users/users.service.js';
import { FishingRepository } from './fishing.repository.js';
import { MILLI_PER_FISH, rodSpeedBonusPercent } from './lib/fishing-rate.js';
import { buildFishingStatus, toHammockState, toStateChanges } from './lib/fishing-status.js';
import { enhanceRod, summonOtterFriend, takeWholeFish } from './lib/hammock-actions.js';
import { type HammockState, settleHammock } from './lib/settle-hammock.js';

const NOTHING_TO_STORE = '해먹에 저장할 물고기가 없어요';

export interface RodEnhancement {
  rodLevel: number;
  rodSpeedBonusPercent: number;
}

type HammockChange = (settled: HammockState, today: string) => HammockState;

// 비즈니스 로직 계층 (docs/design/fishing.md)
// 수량은 항상 서버 시각으로 정산한다. 클라이언트가 보낸 수량은 받지 않는다.
@Injectable()
export class FishingService {
  constructor(
    private readonly fishingRepository: FishingRepository,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  /** 지금 해먹 상태. 계산만 하고 저장하지 않는다 */
  async getStatus(userId: string): Promise<FishingStatusResponse> {
    await this.usersService.findById(userId);
    const now = new Date();
    const row = await this.fishingRepository.findOrCreate(userId, now);
    const hammock = settleHammock(toHammockState(row), now);
    return buildFishingStatus(hammock, row.warehouseFish, now);
  }

  /** 해먹의 물고기(정수 부분)를 창고로 옮긴다 */
  async storeFish(userId: string): Promise<StoreFishResponse> {
    await this.usersService.findById(userId);
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const row = await this.fishingRepository.lockOrCreate(manager, userId, now);
      const { state, takenFish } = takeWholeFish(settleHammock(toHammockState(row), now));
      if (takenFish < 1) throw new ConflictException(NOTHING_TO_STORE);

      const warehouseFish = row.warehouseFish + takenFish;
      await this.fishingRepository.updateState(manager, row.id, {
        ...toStateChanges(state),
        warehouseFish,
      });
      await this.fishingRepository.addLedgerEntry(manager, {
        userId,
        type: 'STORE',
        amount: takenFish,
      });
      return {
        storedFish: takenFish,
        warehouseFish,
        hammockFish: state.milliFish / MILLI_PER_FISH,
      };
    });
  }

  /** 오늘 낚싯대를 강화한다. 호출하는 쪽(퀴즈·출석)의 트랜잭션 안에서 실행한다 */
  async enhanceRod(
    userId: string,
    levels: number,
    manager: EntityManager,
  ): Promise<RodEnhancement> {
    const next = await this.changeHammock(manager, userId, (settled, today) =>
      enhanceRod(settled, levels, today),
    );
    return { rodLevel: next.rodLevel, rodSpeedBonusPercent: rodSpeedBonusPercent(next.rodLevel) };
  }

  /** 오늘 자정까지 해달 친구가 함께 낚시한다. 호출하는 쪽(출석)의 트랜잭션 안에서 실행한다 */
  async summonOtterFriend(userId: string, manager: EntityManager): Promise<void> {
    await this.changeHammock(manager, userId, summonOtterFriend);
  }

  /** 속도를 바꾸기 전에 반드시 지금까지 잡은 물고기를 먼저 정산한다 */
  private async changeHammock(
    manager: EntityManager,
    userId: string,
    change: HammockChange,
  ): Promise<HammockState> {
    const now = new Date();
    const row = await this.fishingRepository.lockOrCreate(manager, userId, now);
    const next = change(settleHammock(toHammockState(row), now), toKstDateString(now));
    await this.fishingRepository.updateState(manager, row.id, toStateChanges(next));
    return next;
  }
}
