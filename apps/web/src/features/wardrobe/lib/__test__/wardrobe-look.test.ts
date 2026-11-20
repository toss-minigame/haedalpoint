import { describe, expect, it } from 'vitest';
import type { OutfitItem } from '@/entities/otter';
import { equippedOf, isSameSet, previewsOf, savableOf, shortFish } from '../wardrobe-look';

const item = (
  code: OutfitItem['code'],
  slot: OutfitItem['slot'],
  owned: boolean,
  equipped = false,
): OutfitItem => ({ code, slot, priceFish: 48_000, owned, equipped });

const OUTFITS = [
  item('straw_hat', 'head', true, true),
  item('captain_hat', 'head', false),
  item('sunglasses', 'face', true),
  item('busan_tee', 'body', false),
];

describe('equippedOf', () => {
  it('입고 있는 소품만 고른다', () => {
    expect(equippedOf(OUTFITS)).toEqual(['straw_hat']);
  });
});

describe('savableOf', () => {
  it('보이는 연 소품을 저장한다', () => {
    expect(savableOf(['straw_hat', 'sunglasses'], OUTFITS)).toEqual(['straw_hat', 'sunglasses']);
  });

  it('잠긴 소품을 입어 보는 부위는 원래 입고 있던 소품을 그대로 둔다', () => {
    // 선장 모자(잠김)를 입어 보느라 밀짚모자가 가려졌지만, 저장된 차림은 밀짚모자 그대로다
    expect(savableOf(['captain_hat', 'sunglasses'], OUTFITS)).toEqual(['straw_hat', 'sunglasses']);
  });

  it('다른 부위의 잠긴 소품을 입어 봐도 저장된 차림은 바뀌지 않는다', () => {
    expect(savableOf(['straw_hat', 'busan_tee'], OUTFITS)).toEqual(['straw_hat']);
  });

  it('연 소품을 벗으면 저장에서도 뺀다', () => {
    expect(savableOf([], OUTFITS)).toEqual([]);
    expect(savableOf(['busan_tee'], OUTFITS)).toEqual([]);
  });
});

describe('previewsOf', () => {
  it('잠긴 채 입어 보는 소품을 고른다', () => {
    const previews = previewsOf(['captain_hat', 'sunglasses'], OUTFITS);

    expect(previews.map((outfit) => outfit.code)).toEqual(['captain_hat']);
  });

  it('입어 보지 않은 잠긴 소품은 넣지 않는다', () => {
    expect(previewsOf(['straw_hat'], OUTFITS)).toEqual([]);
  });
});

describe('isSameSet', () => {
  it('순서가 달라도 같은 소품이면 같다', () => {
    expect(isSameSet(['straw_hat', 'sunglasses'], ['sunglasses', 'straw_hat'])).toBe(true);
  });

  it('개수나 소품이 다르면 다르다', () => {
    expect(isSameSet(['straw_hat'], ['straw_hat', 'sunglasses'])).toBe(false);
    expect(isSameSet(['straw_hat'], ['captain_hat'])).toBe(false);
    expect(isSameSet([], [])).toBe(true);
  });
});

describe('shortFish', () => {
  it('충분하면 0 이다', () => {
    expect(shortFish(48_000, 48_000)).toBe(0);
    expect(shortFish(48_000, 100_000)).toBe(0);
  });

  it('모자란 만큼을 올림해서 돌려준다', () => {
    expect(shortFish(48_000, 47_999.2)).toBe(1);
    expect(shortFish(48_000, 0)).toBe(48_000);
  });
});
