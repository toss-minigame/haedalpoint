import snowfield from '@/shared/assets/background/snowfield.jpg';
import otter3dModel from '@/shared/assets/otter/otter-3d.glb?url';
import otterHappy from '@/shared/assets/otter/otter-happy.png';
import otterStill from '@/shared/assets/otter/otter-still.png';
import snowman3dModel from '@/shared/assets/otter/snowman-3d.glb?url';
import fishBluefish from '@/shared/assets/scene/fish-bluefish.png';
import fishGoldfish from '@/shared/assets/scene/fish-goldfish.png';
import puddle from '@/shared/assets/waterSurface/puddle.png';

/**
 * 말풍선에 넣는 해달 얼굴 (활짝 웃으며 손을 든 모습, 투명 배경). 튜토리얼과 첫 안내에서 쓴다.
 * 화면에 48px 로 나오므로 3배 화면에 맞춰 129×144 로 줄여 두었다. 더 크게 쓰려면 원본에서 다시 만든다
 */
export const OTTER_BUBBLE_SPRITE = otterHappy;

/**
 * 3D 해달 모델 (Blender 에서 만든 glb). 낚싯대를 쥔 앉은 모습이고 동작은 코드로 움직인다.
 * 주소만 들고 있고, 장면을 그릴 때 내려받는다
 */
export const OTTER_3D_MODEL = otter3dModel;

/**
 * 3D 해달을 그대로 찍어 둔 정지 그림 (655×543, 투명 배경. 낚싯대를 드리우고 기다리는 모습과 눈밭의 양동이).
 * 3D 를 불러오는 동안과 3D 를 쓸 수 없는 기기에서 해달 자리에 그린다. 모델을 고치면 다시 찍어야 한다
 * (찍는 범위와 낚싯대 끝 자리는 otter-3d/otter-view.ts)
 */
export const OTTER_STILL_SPRITE = otterStill;

/** 해달 친구로 그리는 3D 눈사람 모델 (Blender 에서 만든 glb). 친구가 올 때만 내려받는다 */
export const SNOWMAN_3D_MODEL = snowman3dModel;

/** 물웅덩이에서 튀어 오르는 물고기 (긴 변 128px, 투명 배경, 모두 왼쪽을 바라봄) */
export const FISH_SPRITES = {
  goldfish: fishGoldfish,
  bluefish: fishBluefish,
} as const;

/** 설원 배경 (1536×1024, 눈밭은 위에서 51%부터, 오른쪽에 이글루) */
export const SNOW_BACKGROUND_SPRITE = snowfield;

/** 해달 앞 물웅덩이 (446×85, 투명 배경, 사방 3px 여백) */
export const PUDDLE_SPRITE = puddle;
