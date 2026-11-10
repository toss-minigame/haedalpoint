import hammock0 from '@/shared/assets/hammock/hammock-0.png';
import hammock1 from '@/shared/assets/hammock/hammock-1.png';
import hammock2 from '@/shared/assets/hammock/hammock-2.png';
import hammock3 from '@/shared/assets/hammock/hammock-3.png';
import hammock4 from '@/shared/assets/hammock/hammock-4.png';
import hammock5 from '@/shared/assets/hammock/hammock-5.png';
import { hammockTier } from './hammock-tier';

// 해먹 종류별 이미지 (144×144, 투명 배경). hammock-name.ts 의 이름과 같은 순서:
// 0 기본 → 1 그물 → 2 나무 → 3 대나무 → 4 산호 → 5 진주. 두 단계마다 종류가 바뀐다 (hammock-tier.ts)
const HAMMOCK_IMAGES = [hammock0, hammock1, hammock2, hammock3, hammock4, hammock5] as const;

/** 단계에 맞는 해먹 이미지. 이미지가 없는 높은 단계면 가장 높은 이미지를 쓴다 */
export function hammockImage(level: number): string {
  return HAMMOCK_IMAGES[hammockTier(Math.floor(level), HAMMOCK_IMAGES.length - 1)] ?? hammock0;
}
