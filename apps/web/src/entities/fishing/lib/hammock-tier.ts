// 해먹 단계(0~10)를 해먹 종류(0~5)로 묶는다. 1·2단계 그물, 3·4 나무, 5·6 대나무, 7·8 산호, 9·10 진주
const LEVELS_PER_TIER = 2;

/** 해먹 단계에 맞는 종류 번호 (0 = 기본 해먹). maxTier 를 넘으면 maxTier */
export function hammockTier(level: number, maxTier: number): number {
  if (level <= 0) return 0;
  return Math.min(Math.ceil(level / LEVELS_PER_TIER), maxTier);
}
