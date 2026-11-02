import type { AnswerQuizRequest } from '@haedalpoint/shared';
import { IsBoolean } from 'class-validator';

export class AnswerQuizDto implements AnswerQuizRequest {
  // true = O, false = X
  @IsBoolean()
  answer: boolean;
}
