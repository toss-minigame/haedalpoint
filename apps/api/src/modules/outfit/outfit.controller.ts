import type { OutfitCode, OutfitsResponse } from '@haedalpoint/shared';
import { Body, Controller, Get, Param, ParseEnumPipe, Post, Put } from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator.js';
import { EquipOutfitsDto } from './dto/equip-outfits.dto.js';
import { OUTFIT_CODES } from './lib/outfit-rules.js';
import { OutfitService } from './outfit.service.js';

// 표현 계층: HTTP 요청/응답만 다루고 로직은 서비스에 위임
@Controller('outfits')
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  @Get()
  getOutfits(@CurrentUserId() userId: string): Promise<OutfitsResponse> {
    return this.outfitService.getOutfits(userId);
  }

  // 창고 물고기를 내고 소품을 연다 (연 소품은 바로 입는다)
  @Post(':code/unlock')
  unlock(
    @CurrentUserId() userId: string,
    @Param('code', new ParseEnumPipe(OUTFIT_CODES)) code: OutfitCode,
  ): Promise<OutfitsResponse> {
    return this.outfitService.unlock(userId, code);
  }

  // 입을 소품 전체를 보낸다 (빈 배열이면 모두 벗는다)
  @Put('equipped')
  equip(@CurrentUserId() userId: string, @Body() dto: EquipOutfitsDto): Promise<OutfitsResponse> {
    return this.outfitService.equip(userId, dto.codes);
  }
}
