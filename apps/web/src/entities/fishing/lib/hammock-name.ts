// 해먹 단계별 이름 (0단계 = 기본). 단계 수·용량은 서버 정책값(hammockMaxLevel 등)을 따른다
const BASE_NAME = '해먹';
const LEVEL_NAMES = ['그물 해먹', '나무 해먹', '대나무 해먹', '산호 해먹', '진주 해먹'];

/** 단계에 맞는 해먹 이름. 이름이 없는 높은 단계면 가장 높은 이름을 쓴다 */
export function hammockName(level: number): string {
  if (level <= 0) return BASE_NAME;
  return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1] ?? BASE_NAME;
}
