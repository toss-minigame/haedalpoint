import { describe, expect, it } from 'vitest';
import { OUTFIT_CODES, OUTFITS, toggleOutfit } from '../otter-outfits';

describe('toggleOutfit', () => {
  it('입지 않은 소품을 누르면 입는다', () => {
    expect(toggleOutfit([], 'straw_hat')).toEqual(['straw_hat']);
  });

  it('입고 있던 소품을 누르면 벗는다', () => {
    expect(toggleOutfit(['straw_hat', 'sunglasses'], 'straw_hat')).toEqual(['sunglasses']);
  });

  it('같은 부위의 다른 소품은 벗기고 입는다', () => {
    expect(toggleOutfit(['straw_hat', 'sunglasses'], 'captain_hat')).toEqual([
      'sunglasses',
      'captain_hat',
    ]);
  });

  it('부위가 다르면 함께 입는다', () => {
    expect(toggleOutfit(['captain_hat'], 'sunglasses')).toEqual(['captain_hat', 'sunglasses']);
  });

  it('옷은 하나만 입고, 모자·선글라스와 함께 입는다', () => {
    expect(toggleOutfit(['straw_hat', 'aquarium_tee'], 'busan_tee')).toEqual([
      'straw_hat',
      'busan_tee',
    ]);
  });

  it('받은 목록을 바꾸지 않는다', () => {
    const worn = ['straw_hat'] as const;
    toggleOutfit(worn, 'captain_hat');
    expect(worn).toEqual(['straw_hat']);
  });
});

describe('OUTFITS', () => {
  it('소품마다 이름과 부위가 있다', () => {
    for (const code of OUTFIT_CODES) {
      expect(OUTFITS[code].name.length).toBeGreaterThan(0);
      expect(['head', 'face', 'body']).toContain(OUTFITS[code].slot);
    }
  });
});
