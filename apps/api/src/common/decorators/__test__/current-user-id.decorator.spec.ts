import { UnauthorizedException } from '@nestjs/common';
import { extractUserId } from '../current-user-id.decorator';

describe('extractUserId', () => {
  const VALID = '00000000-0000-4000-8000-000000000001';

  it('returns the uuid from X-User-Id', () => {
    expect(extractUserId({ headers: { 'x-user-id': VALID } })).toBe(VALID);
  });

  it('uses the first value when the header is repeated', () => {
    expect(extractUserId({ headers: { 'x-user-id': [VALID, 'other'] } })).toBe(VALID);
  });

  it('throws Unauthorized when the header is missing', () => {
    expect(() => extractUserId({ headers: {} })).toThrow(UnauthorizedException);
  });

  it('throws Unauthorized when the header is not a uuid', () => {
    expect(() => extractUserId({ headers: { 'x-user-id': 'not-a-uuid' } })).toThrow(
      UnauthorizedException,
    );
  });
});
