const PG_UNIQUE_VIOLATION = '23505';

// TypeORM QueryFailedError 는 pg 에러의 code 를 자신에게 복사한다.
// typeorm 을 import 하지 않고 형태만 확인해 서비스 계층에서도 쓸 수 있게 둔다.
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === PG_UNIQUE_VIOLATION
  );
}
