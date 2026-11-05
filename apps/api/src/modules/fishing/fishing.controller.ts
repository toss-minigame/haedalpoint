import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator.js';
import { FishingService } from './fishing.service.js';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
@Controller('fishing')
export class FishingController {
  constructor(private readonly fishingService: FishingService) {}

  @Get('me')
  getStatus(@CurrentUserId() userId: string) {
    return this.fishingService.getStatus(userId);
  }

  @Get('warehouse')
  getWarehouse(@CurrentUserId() userId: string) {
    return this.fishingService.getWarehouse(userId);
  }

  @Post('store')
  storeFish(@CurrentUserId() userId: string) {
    return this.fishingService.storeFish(userId);
  }

  // 보상형 광고를 끝까지 본 뒤(`userEarnedReward`)에만 호출한다
  @Post('ad-enhance-rod')
  adEnhanceRod(@CurrentUserId() userId: string) {
    return this.fishingService.adEnhanceRod(userId);
  }

  @Post('ad-expand-hammock')
  adExpandHammock(@CurrentUserId() userId: string) {
    return this.fishingService.adExpandHammock(userId);
  }
}
