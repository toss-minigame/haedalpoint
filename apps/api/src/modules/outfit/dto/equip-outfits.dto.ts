import type { EquipOutfitsRequest, OutfitCode } from '@haedalpoint/shared';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { OUTFIT_CODES } from '../lib/outfit-rules.js';

export class EquipOutfitsDto implements EquipOutfitsRequest {
  // 입을 소품 전체. 빈 배열이면 모두 벗는다
  @IsArray()
  @ArrayMaxSize(OUTFIT_CODES.length)
  @ArrayUnique()
  @IsIn(OUTFIT_CODES, { each: true })
  codes: OutfitCode[];
}
