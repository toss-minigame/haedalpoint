import otterAwkward from '@/shared/assets/otter/otter-awkward.png';
import otterFishingCatch from '@/shared/assets/otter/otter-fishing-catch.png';
import otterFishingIdle from '@/shared/assets/otter/otter-fishing-idle.png';
import otterFriendFishingCatch from '@/shared/assets/otter/otter-friend-fishing-catch.png';
import otterFriendFishingIdle from '@/shared/assets/otter/otter-friend-fishing-idle.png';
import otterHappy from '@/shared/assets/otter/otter-happy.png';
import otterIdle from '@/shared/assets/otter/otter-idle.png';
import otterSad from '@/shared/assets/otter/otter-sad.png';
import fishAngelfish from '@/shared/assets/scene/fish-angelfish.png';
import fishBluefish from '@/shared/assets/scene/fish-bluefish.png';
import fishGoldfish from '@/shared/assets/scene/fish-goldfish.png';
import fishPufferfish from '@/shared/assets/scene/fish-pufferfish.png';
import pier from '@/shared/assets/scene/pier.png';
import seaBackground from '@/shared/assets/scene/sea-background.jpg';
import seaWave from '@/shared/assets/scene/sea-wave.png';

/** 해달 감정 상태별 스프라이트 (400×400, 투명 배경) */
export const OTTER_SPRITES = {
  idle: otterIdle,
  happy: otterHappy,
  sad: otterSad,
  awkward: otterAwkward,
} as const;

export type OtterMood = keyof typeof OTTER_SPRITES;

/**
 * 낚시 장면 스프라이트 (576×576, 투명 배경).
 * 두 장은 의자·바구니 위치를 맞춰 두었으므로 같은 자리에 겹쳐 그리면 된다.
 * 성공 스프라이트의 바늘은 비어 있고, 잡힌 물고기는 장면에서 따로 그린다.
 */
export const OTTER_FISHING_SPRITES = {
  idle: otterFishingIdle, // 의자에 앉아 낚싯대를 드리운 모습
  catch: otterFishingCatch, // 일어나 낚싯대를 들어 올린 모습 (바늘은 비어 있음)
} as const;

/**
 * 해달 친구 낚시 스프라이트 (576×698, 투명 배경). 7일차 출석으로 오는 친구가 선착장에서 함께 낚시한다.
 * 두 장은 같은 영역으로 잘라 몸 위치를 맞춰 두었으므로 같은 자리에 겹쳐 그리면 된다.
 */
export const OTTER_FRIEND_FISHING_SPRITES = {
  idle: otterFriendFishingIdle, // 앉아서 낚싯대를 쥔 모습
  catch: otterFriendFishingCatch, // 팔을 들고 낚싯대를 들어 올린 모습
} as const;

/** 해달이 앉아 낚시하는 나무 선착장 (600×455, 투명 배경, 왼쪽 끝은 화면 밖으로 이어지는 모양) */
export const PIER_SPRITE = pier;

/** 바다에서 헤엄치는 물고기 (긴 변 128px, 투명 배경, 모두 왼쪽을 바라봄) */
export const FISH_SPRITES = {
  angelfish: fishAngelfish,
  goldfish: fishGoldfish,
  pufferfish: fishPufferfish,
  bluefish: fishBluefish,
} as const;

/** 하늘·바다 배경 (1536×1024, 수평선은 위에서 63.7%) */
export const SEA_BACKGROUND_SPRITE = seaBackground;

/** 수면 파도 띠 (960×157, 양 끝이 이어지는 타일, 아래로 갈수록 투명) */
export const SEA_WAVE_SPRITE = seaWave;
