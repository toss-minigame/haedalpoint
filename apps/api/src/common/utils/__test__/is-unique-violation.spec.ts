import { isUniqueViolation } from '../is-unique-violation.js';

describe('isUniqueViolation', () => {
  it('returns true for a pg unique violation (code 23505)', () => {
    expect(isUniqueViolation(Object.assign(new Error('duplicate key'), { code: '23505' }))).toBe(
      true,
    );
  });

  it.each([
    ['another pg error code', Object.assign(new Error('connection lost'), { code: '08006' })],
    ['an error without code', new Error('boom')],
    ['null', null],
    ['a string', '23505'],
  ])('returns false for %s', (_label, error) => {
    expect(isUniqueViolation(error)).toBe(false);
  });
});
