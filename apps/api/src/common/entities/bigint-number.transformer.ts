import type { ValueTransformer } from 'typeorm';

// pg 드라이버는 bigint 를 문자열로 돌려준다. 물고기 수량은 Number.MAX_SAFE_INTEGER 보다 훨씬 작으므로
// 숫자로 바꿔 다룬다.
export const bigintNumberTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
