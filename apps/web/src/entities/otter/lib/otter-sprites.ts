import snowfield from '@/shared/assets/background/snowfield.jpg';
import otterAwkward from '@/shared/assets/otter/otter-awkward.png';
import otterExcited from '@/shared/assets/otter/otter-excited.png';
import otterFishingCaught from '@/shared/assets/otter/otter-fishing-caught.png';
import otterFishingIdle from '@/shared/assets/otter/otter-fishing-idle.png';
import otterFishingLift from '@/shared/assets/otter/otter-fishing-lift.png';
import otterFishingNotice from '@/shared/assets/otter/otter-fishing-notice.png';
import otterFishingPull from '@/shared/assets/otter/otter-fishing-pull.png';
import otterHammockFull from '@/shared/assets/otter/otter-hammock-full.png';
import otterHappy from '@/shared/assets/otter/otter-happy.png';
import otterIdle from '@/shared/assets/otter/otter-idle.png';
import otter3dModel from '@/shared/assets/otter/otter-3d.glb?url';
import otterLove from '@/shared/assets/otter/otter-love.png';
import otterSurprised from '@/shared/assets/otter/otter-surprised.png';
import fishAngelfish from '@/shared/assets/scene/fish-angelfish.png';
import fishBluefish from '@/shared/assets/scene/fish-bluefish.png';
import fishGoldfish from '@/shared/assets/scene/fish-goldfish.png';
import fishPufferfish from '@/shared/assets/scene/fish-pufferfish.png';
import puddle from '@/shared/assets/waterSurface/puddle.png';

/**
 * 해달 표정별 스프라이트 (앉은 모습, 투명 배경, 사방 20px 여백).
 * 표정마다 크기가 조금씩 다르다 (가로 398~455, 세로 507~531).
 */
export const OTTER_SPRITES = {
  idle: otterIdle, // 기본 미소
  happy: otterHappy, // 활짝 웃으며 손을 든 모습
  surprised: otterSurprised, // 무언가 알아챈 모습 (!)
  awkward: otterAwkward, // 눈을 찡긋하며 땀 흘리는 모습
  excited: otterExcited, // 눈을 꼭 감고 신난 모습
  love: otterLove, // 하트를 띄운 모습
} as const;

export type OtterMood = keyof typeof OTTER_SPRITES;

/**
 * 낚시 장면의 해달 애니메이션 프레임 (낚싯대를 쥔 그림, 투명 배경, 사방 20px 여백).
 * 대기 → 입질 알아챔 → 당김 → 들어 올림 → 잡음 순서. 줄·물고기는 장면에서 그린다.
 * 그리는 자리·크기·낚싯대 끝은 scene-state.ts 의 OTTER_SCENE_FRAMES 에 맞춰 두었다.
 */
export const OTTER_FISHING_FRAMES = [
  otterFishingIdle,
  otterFishingNotice,
  otterFishingPull,
  otterFishingLift,
  otterFishingCaught,
] as const;

/**
 * 3D 해달 모델 (시험판, Blender 에서 만든 glb). 낚싯대를 쥔 앉은 모습이고 동작은 코드로 움직인다.
 * 주소만 들고 있고, 3D 를 켤 때만 내려받는다
 */
export const OTTER_3D_MODEL = otter3dModel;

/** 해먹이 가득 찼을 때 해달: 물고기가 가득한 양동이를 들고 선 모습 (투명 배경, 사방 20px 여백) */
export const OTTER_FULL_SPRITE = otterHammockFull;

/**
 * 해달 친구 (7일차 출석으로 와서 물웅덩이 왼쪽에 앉는다). 낚싯대 없이 표정 그림으로
 * 해달과 같은 순서의 동작을 한다 (기다릴 때는 하트).
 */
export const OTTER_FRIEND_FISHING_FRAMES = [
  OTTER_SPRITES.love,
  OTTER_SPRITES.surprised,
  OTTER_SPRITES.awkward,
  OTTER_SPRITES.excited,
  OTTER_SPRITES.happy,
] as const;

/** 물웅덩이에서 튀어 오르는 물고기 (긴 변 128px, 투명 배경, 모두 왼쪽을 바라봄) */
export const FISH_SPRITES = {
  angelfish: fishAngelfish,
  goldfish: fishGoldfish,
  pufferfish: fishPufferfish,
  bluefish: fishBluefish,
} as const;

/** 설원 배경 (1536×1024, 눈밭은 위에서 51%부터, 오른쪽에 이글루) */
export const SNOW_BACKGROUND_SPRITE = snowfield;

/** 해달 앞 물웅덩이 (446×85, 투명 배경, 사방 3px 여백) */
export const PUDDLE_SPRITE = puddle;
