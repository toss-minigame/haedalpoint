import type { OutfitCode, OutfitsResponse } from '@haedalpoint/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FishingService } from '../fishing/fishing.service.js';
import { UsersService } from '../users/users.service.js';
import type { OtterOutfit } from './entities/otter-outfit.entity.js';
import {
  buildOutfits,
  equipProblem,
  equipWith,
  type OwnedOutfit,
  priceFishOf,
} from './lib/outfit-rules.js';
import { OutfitRepository } from './outfit.repository.js';

const ALREADY_OWNED = '이미 연 소품이에요';
const NOT_OWNED = '아직 열지 않은 소품은 입을 수 없어요';
const SLOT_TAKEN = '같은 부위에는 하나만 입을 수 있어요';

const toOwned = (rows: readonly OtterOutfit[]): OwnedOutfit[] =>
  rows.map(({ outfitCode, equipped }) => ({ code: outfitCode, equipped }));

// 비즈니스 로직 계층 (docs/design/otter-outfit.md)
// 소품은 창고 물고기를 내고 열고, 연 소품만 입힌다. 낚시 속도·용량에는 영향이 없다.
@Injectable()
export class OutfitService {
  constructor(
    private readonly outfitRepository: OutfitRepository,
    private readonly fishingService: FishingService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  /** 소품 목록(열었는지·입었는지·값)과 창고 물고기 */
  async getOutfits(userId: string): Promise<OutfitsResponse> {
    await this.usersService.findById(userId);
    const [rows, warehouseFish] = await Promise.all([
      this.outfitRepository.findByUserId(userId),
      this.fishingService.warehouseFish(userId),
    ]);
    return { warehouseFish, outfits: buildOutfits(toOwned(rows)) };
  }

  /**
   * 창고 물고기를 내고 소품을 연다. 연 소품은 바로 입힌다 (같은 부위에 입고 있던 소품은 벗는다).
   * 물고기 차감·이력·소품 기록을 한 트랜잭션으로 남긴다. 물고기가 모자라거나 이미 열었으면 409 이고,
   * 그때는 물고기가 줄지 않는다. 창고 행을 잠그므로 연타해도 한 번만 차감된다.
   */
  async unlock(userId: string, code: OutfitCode): Promise<OutfitsResponse> {
    await this.usersService.findById(userId);
    return this.dataSource.transaction(async (manager) => {
      const warehouseFish = await this.fishingService.spendWarehouseFish(
        userId,
        priceFishOf(code),
        'OUTFIT',
        manager,
        new Date(),
      );
      const owned = toOwned(await this.outfitRepository.findByUserId(userId, manager));
      // 여기서 던지면 트랜잭션이 되돌려져 물고기도 그대로 남는다
      if (owned.some((outfit) => outfit.code === code)) throw new ConflictException(ALREADY_OWNED);

      const equipped = equipWith(
        owned.filter((outfit) => outfit.equipped).map((outfit) => outfit.code),
        code,
      );
      await this.outfitRepository.addOwned(manager, userId, code);
      await this.outfitRepository.setEquipped(manager, userId, equipped);
      const next = [...owned, { code, equipped: true }].map((outfit) => ({
        code: outfit.code,
        equipped: equipped.includes(outfit.code),
      }));
      return { warehouseFish, outfits: buildOutfits(next) };
    });
  }

  /** 입을 소품을 codes 로 맞춘다 (빈 배열이면 모두 벗는다). 열지 않은 소품은 403, 같은 부위가 겹치면 400 */
  async equip(userId: string, codes: readonly OutfitCode[]): Promise<OutfitsResponse> {
    await this.usersService.findById(userId);
    return this.dataSource.transaction(async (manager) => {
      const owned = toOwned(await this.outfitRepository.findByUserId(userId, manager));
      const problem = equipProblem(
        codes,
        owned.map((outfit) => outfit.code),
      );
      if (problem === 'NOT_OWNED') throw new ForbiddenException(NOT_OWNED);
      if (problem === 'SLOT_TAKEN') throw new BadRequestException(SLOT_TAKEN);

      await this.outfitRepository.setEquipped(manager, userId, codes);
      const next = owned.map((outfit) => ({ ...outfit, equipped: codes.includes(outfit.code) }));
      return {
        warehouseFish: await this.fishingService.warehouseFish(userId),
        outfits: buildOutfits(next),
      };
    });
  }
}
