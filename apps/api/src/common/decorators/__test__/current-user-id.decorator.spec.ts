import { UnauthorizedException } from '@nestjs/common';
import { extractUserId } from '../current-user-id.decorator.js';

describe('extractUserId', () => {
  const VALID = '00000000-0000-4000-8000-000000000001';

  it('returns the user id attached by the auth guard', () => {
    expect(extractUserId({ userId: VALID })).toBe(VALID);
  });

  it('throws Unauthorized when the guard did not attach a user id', () => {
    expect(() => extractUserId({})).toThrow(UnauthorizedException);
  });
});
