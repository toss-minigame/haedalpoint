import type { AnonLoginRequest } from '@haedalpoint/shared';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_CODE_LENGTH = 512;

export class AnonLoginDto implements AnonLoginRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CODE_LENGTH)
  code: string;
}
