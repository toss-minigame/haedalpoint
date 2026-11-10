import type {
  ApplyBaitResponse,
  BaitRouletteSpin,
  BaitRouletteTodayResponse,
  SpinBaitRouletteResponse,
} from '@haedalpoint/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isUniqueViolation } from '../../common/utils/is-unique-violation.js';
import { nextKstMidnight, toKstDateString } from '../../common/utils/kst-date.js';
import { FishingService } from '../fishing/fishing.service.js';
import { UsersService } from '../users/users.service.js';
import type { RouletteSpin } from './entities/roulette-spin.entity.js';
import { baitsOfMonth, monthOf, pickBaitIndex, TOTAL_BAIT_WEIGHT } from './lib/pick-bait.js';
import { RouletteRoller } from './lib/roulette-roller.js';
import { RouletteRepository } from './roulette.repository.js';

const ALREADY_SPUN = '오늘은 이미 룰렛을 돌렸어요';
const NO_SPIN_TODAY = '오늘 룰렛을 먼저 돌려 주세요';
const ALREADY_APPLIED = '오늘 미끼는 이미 적용했어요';

// 비즈니스 로직 계층 (docs/design/bait-roulette.md)
// 결과는 서버 난수로만 정한다. 하루 한 번은 (user_id, spin_date) 유니크 제약이 보장한다.
//
// ⚠️ 서버는 광고 시청 여부를 직접 검증할 수 없다. ad-apply 는 클라이언트가 SDK
// `userEarnedReward` 이벤트를 받은 뒤에만 호출해야 한다.
@Injectable()
export class RouletteService {
  constructor(
    private readonly rouletteRepository: RouletteRepository,
    private readonly usersService: UsersService,
    private readonly fishingService: FishingService,
    private readonly roller: RouletteRoller,
    private readonly dataSource: DataSource,
  ) {}

  /** 이달의 미끼 칸과 오늘 결과 */
  async getToday(userId: string): Promise<BaitRouletteTodayResponse> {
    await this.usersService.findById(userId);
    const now = new Date();
    const today = toKstDateString(now);
    const spin = await this.rouletteRepository.findSpin(userId, today);
    return {
      date: today,
      month: monthOf(today),
      fishes: baitsOfMonth(monthOf(today)),
      spin: spin ? toSpinResponse(spin) : null,
      canSpin: spin === null,
      canApply: spin !== null && spin.appliedAt === null,
      resetAt: nextKstMidnight(now).toISOString(),
    };
  }

  /** 오늘 한 번 룰렛을 돌린다. 결과는 아직 적용되지 않는다 */
  async spin(userId: string): Promise<SpinBaitRouletteResponse> {
    await this.usersService.findById(userId);
    const today = toKstDateString(new Date());
    if (await this.rouletteRepository.findSpin(userId, today)) {
      throw new ConflictException(ALREADY_SPUN);
    }

    const bait = baitsOfMonth(monthOf(today))[pickBaitIndex(this.roller.roll(TOTAL_BAIT_WEIGHT))];
    try {
      // 조회 → insert 사이 레이스(연타)는 (user_id, spin_date) 유니크 제약이 막는다
      const spin = await this.rouletteRepository.createSpin({
        userId,
        spinDate: today,
        fishCode: bait.code,
        fishName: bait.name,
        speedBonusPercent: bait.speedBonusPercent,
      });
      return toSpinResponse(spin);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_SPUN);
      throw error;
    }
  }

  /** 광고 시청 완료 → 오늘 결과를 적용 기록 + 그날 자정까지 낚시 속도 보너스 (한 트랜잭션) */
  async applyAdBait(userId: string): Promise<ApplyBaitResponse> {
    await this.usersService.findById(userId);
    // 결과 날짜와 보너스 적용 날짜가 자정 경계에서 어긋나지 않도록 한 시각을 함께 쓴다
    const now = new Date();
    const spin = await this.rouletteRepository.findSpin(userId, toKstDateString(now));
    if (!spin) throw new NotFoundException(NO_SPIN_TODAY);
    if (spin.appliedAt) throw new ConflictException(ALREADY_APPLIED);

    await this.dataSource.transaction(async (manager) => {
      const applied = await this.rouletteRepository.markApplied(spin.id, now, manager);
      if (!applied) throw new ConflictException(ALREADY_APPLIED);
      await this.fishingService.applyBait(userId, spin.speedBonusPercent, manager, now);
    });
    return toSpinResponse({ ...spin, appliedAt: now });
  }
}

function toSpinResponse(spin: RouletteSpin): BaitRouletteSpin {
  return {
    fishCode: spin.fishCode,
    fishName: spin.fishName,
    speedBonusPercent: spin.speedBonusPercent,
    spunAt: spin.createdAt.toISOString(),
    appliedAt: spin.appliedAt ? spin.appliedAt.toISOString() : null,
  };
}
