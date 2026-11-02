// 앱인토스 개발용 보상형 광고 테스트 ID (개발 중 실제 ID 사용은 정책 위반)
const TEST_REWARDED_AD_GROUP_ID = 'ait-ad-test-rewarded-id';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  // 콘솔에서 발급한 보상형 광고 그룹 ID. 비어 있으면 개발 모드에서만 테스트 ID를 쓰고,
  // 운영 빌드에서는 광고 기능을 끈다(null).
  rewardedAdGroupId:
    import.meta.env.VITE_REWARDED_AD_GROUP_ID ||
    (import.meta.env.DEV ? TEST_REWARDED_AD_GROUP_ID : null),
} as const;
