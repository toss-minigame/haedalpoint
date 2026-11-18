import type { otterLayout, Point, Rect } from '../scene/scene-state';

/**
 * 3D 해달을 장면의 어디에 얼마나 크게 그리는지. three.js 를 불러오지 않는 파일이라,
 * 3D 를 불러오기 전에도 같은 자리에 정지 그림을 그릴 수 있다.
 * 모델 단위: 발 아래 끝이 0, 해달 몸 가운데가 x = 0, 낚싯대는 왼쪽(-x)으로 뻗는다.
 */

/** 모델 키 (앉았을 때 발 아래 끝 ~ 모자 방울 꼭대기, 모델 단위). 장면의 해달 키(px)에 맞춰 크기를 정한다 */
export const MODEL_HEIGHT = 3.37;

/**
 * WebGL 캔버스가 담는 모델 범위. 낚싯대를 들어 올려도, 일어서며 뛰어올라도, 끌어서 돌려
 * 낚싯대가 오른쪽을 향해도 잘리지 않게 여유를 두고 좌우를 같은 폭으로 둔다
 */
export const VIEW = { LEFT: -2.8, RIGHT: 2.8, TOP: 4.5, BOTTOM: -0.15 } as const;

type OtterPlace = Pick<ReturnType<typeof otterLayout>, 'centerX' | 'bottomY' | 'bodyHeight'>;

/** 모델 단위 1 이 장면에서 몇 px 인지 */
export function viewUnit(otter: OtterPlace): number {
  return otter.bodyHeight / MODEL_HEIGHT;
}

/**
 * 모델 범위 (left ~ VIEW.RIGHT, VIEW.BOTTOM ~ top)가 장면에서 차지하는 영역 (px).
 * 눈사람 친구가 있으면 왼쪽·위로 넓혀 부른다
 */
export function viewRect(
  otter: OtterPlace,
  left: number = VIEW.LEFT,
  top: number = VIEW.TOP,
): Rect {
  const unit = viewUnit(otter);
  return {
    x: otter.centerX + left * unit,
    y: otter.bottomY - top * unit,
    width: (VIEW.RIGHT - left) * unit,
    height: (top - VIEW.BOTTOM) * unit,
  };
}

/**
 * 정지 그림 (otter-still.png) 안 낚싯대 끝의 자리 (그림 너비·높이에 대한 비율).
 * 정지 그림은 낚싯대를 드리우고 기다리는 3D 해달을 기본 범위(VIEW) 그대로 찍은 것이다
 */
const STILL_TIP = { x: 0.05, y: 0.681 } as const;

/** 정지 그림을 rect 에 그렸을 때 낚싯대 끝의 장면 좌표 */
export function stillTip(rect: Rect): Point {
  return { x: rect.x + STILL_TIP.x * rect.width, y: rect.y + STILL_TIP.y * rect.height };
}
