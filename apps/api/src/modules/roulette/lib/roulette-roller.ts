import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';

// 룰렛 난수. 결과는 서버에서만 정한다 (클라이언트가 보낸 결과는 받지 않는다).
// 테스트에서 결과를 고정할 수 있도록 provider 로 분리했다.
@Injectable()
export class RouletteRoller {
  /** 0 이상 max 미만 정수 */
  roll(max: number): number {
    return randomInt(max);
  }
}
