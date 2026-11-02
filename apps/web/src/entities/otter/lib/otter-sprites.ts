import otterAwkward from '@/shared/assets/otter/otter-awkward.png';
import otterHappy from '@/shared/assets/otter/otter-happy.png';
import otterIdle from '@/shared/assets/otter/otter-idle.png';
import otterSad from '@/shared/assets/otter/otter-sad.png';

/** 해달 감정 상태별 스프라이트 (400×400, 투명 배경) */
export const OTTER_SPRITES = {
  idle: otterIdle,
  happy: otterHappy,
  sad: otterSad,
  awkward: otterAwkward,
} as const;

export type OtterMood = keyof typeof OTTER_SPRITES;
