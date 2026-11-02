import { bigintNumberTransformer } from '../bigint-number.transformer.js';

describe('bigintNumberTransformer', () => {
  it('reads pg bigint strings as numbers', () => {
    expect(bigintNumberTransformer.from('12345678901')).toBe(12_345_678_901);
  });

  it('keeps null', () => {
    expect(bigintNumberTransformer.from(null)).toBeNull();
  });

  it('writes numbers as they are', () => {
    expect(bigintNumberTransformer.to(42)).toBe(42);
  });
});
