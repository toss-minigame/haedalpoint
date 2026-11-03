import hammock0 from '@/shared/assets/hammock/hammock-0.png';
import hammock1 from '@/shared/assets/hammock/hammock-1.png';
import hammock2 from '@/shared/assets/hammock/hammock-2.png';
import hammock3 from '@/shared/assets/hammock/hammock-3.png';
import hammock4 from '@/shared/assets/hammock/hammock-4.png';
import hammock5 from '@/shared/assets/hammock/hammock-5.png';

// 해먹 단계별 이미지 (144×144, 투명 배경). hammock-name.ts 의 이름과 같은 순서:
// 0 기본 → 1 그물 → 2 나무 → 3 대나무 → 4 산호 → 5 진주
const HAMMOCK_IMAGES = [hammock0, hammock1, hammock2, hammock3, hammock4, hammock5] as const;

/** 단계에 맞는 해먹 이미지. 이미지가 없는 높은 단계면 가장 높은 이미지를 쓴다 */
export function hammockImage(level: number): string {
  const index = Math.min(Math.max(Math.floor(level), 0), HAMMOCK_IMAGES.length - 1);
  return HAMMOCK_IMAGES[index] ?? hammock0;
}
