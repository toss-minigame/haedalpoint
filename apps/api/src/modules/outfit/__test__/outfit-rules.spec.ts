import { OUTFIT_POLICY, OUTFIT_SLOTS } from '../../../common/globals/index.js';
import {
  buildOutfits,
  equipProblem,
  equipWith,
  OUTFIT_CODES,
  priceFishOf,
} from '../lib/outfit-rules.js';

describe('outfit policy', () => {
  it('prices every outfit at one toss point worth of fish for now', () => {
    expect(OUTFIT_POLICY.PRICE_FISH).toBe(48_000);
    for (const code of OUTFIT_CODES) expect(priceFishOf(code)).toBe(48_000);
  });

  it('keeps outfit codes short enough for the outfit_code column', () => {
    for (const code of OUTFIT_CODES) expect(code.length).toBeLessThanOrEqual(32);
  });

  it('puts every outfit in a known slot', () => {
    for (const code of OUTFIT_CODES) expect(['head', 'face', 'body']).toContain(OUTFIT_SLOTS[code]);
  });
});

describe('buildOutfits', () => {
  it('lists every outfit as locked when the user owns nothing', () => {
    const outfits = buildOutfits([]);

    expect(outfits.map((outfit) => outfit.code)).toEqual(OUTFIT_CODES);
    expect(outfits.every((outfit) => !outfit.owned && !outfit.equipped)).toBe(true);
    expect(outfits.every((outfit) => outfit.priceFish === 48_000)).toBe(true);
  });

  it('marks owned and equipped outfits', () => {
    const outfits = buildOutfits([
      { code: 'straw_hat', equipped: true },
      { code: 'busan_tee', equipped: false },
    ]);

    expect(outfits.find((outfit) => outfit.code === 'straw_hat')).toMatchObject({
      slot: 'head',
      owned: true,
      equipped: true,
    });
    expect(outfits.find((outfit) => outfit.code === 'busan_tee')).toMatchObject({
      slot: 'body',
      owned: true,
      equipped: false,
    });
    expect(outfits.find((outfit) => outfit.code === 'sunglasses')).toMatchObject({ owned: false });
  });

  it('ignores rows of outfits that are no longer in the policy', () => {
    const outfits = buildOutfits([{ code: 'retired_hat' as never, equipped: true }]);

    expect(outfits.some((outfit) => outfit.owned)).toBe(false);
  });
});

describe('equipWith', () => {
  it('adds an outfit of another slot', () => {
    expect(equipWith(['straw_hat'], 'sunglasses')).toEqual(['straw_hat', 'sunglasses']);
  });

  it('takes off the outfit worn in the same slot', () => {
    expect(equipWith(['straw_hat', 'aloha_shirt'], 'captain_hat')).toEqual([
      'aloha_shirt',
      'captain_hat',
    ]);
  });

  it('does not change the given list', () => {
    const equipped = ['straw_hat'] as const;
    equipWith(equipped, 'captain_hat');
    expect(equipped).toEqual(['straw_hat']);
  });
});

describe('equipProblem', () => {
  it('allows owned outfits of different slots, and taking everything off', () => {
    expect(equipProblem(['straw_hat', 'sunglasses', 'busan_tee'], OUTFIT_CODES)).toBeNull();
    expect(equipProblem([], [])).toBeNull();
  });

  it('rejects an outfit the user has not unlocked', () => {
    expect(equipProblem(['straw_hat'], ['sunglasses'])).toBe('NOT_OWNED');
  });

  it('rejects two outfits in the same slot', () => {
    expect(equipProblem(['straw_hat', 'captain_hat'], OUTFIT_CODES)).toBe('SLOT_TAKEN');
  });
});
