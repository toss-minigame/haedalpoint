// 해먹 단계를 해먹 종류로 묶는다 (0 = 기본 해먹). 두 단계마다 종류가 바뀐다: 1·2단계 그물, 3·4 나무, 5·6 대나무, 7·8 산호 …
// 최대 단계는 서버 정책값(hammockMaxLevel)이라, 이름·이미지가 모자라면 가장 높은 종류를 쓴다
const LEVELS_PER_TIER = 2;

/** 해먹 단계에 맞는 종류 번호 (0 = 기본 해먹). maxTier 를 넘으면 maxTier */
export function hammockTier(level: number, maxTier: number): number {
  if (level <= 0) return 0;
  return Math.min(Math.ceil(level / LEVELS_PER_TIER), maxTier);
}
