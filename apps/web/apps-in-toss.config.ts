import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에 등록한 appName과 반드시 같아야 업로드할 수 있어요.
  // intoss://{appName} 딥링크 경로에도 쓰여요.
  // TODO: 임시 이름. 콘솔 등록 appName 확정 시 교체 (CLAUDE.md '논의 중' 참고)
  appName: 'haedalhaedal',
  brand: {
    // 앱 기본 색상. 디자인 확정 시 교체 (현재 --primary 토큰과 동일한 값)
    primaryColor: '#171717',
  },
  webView: {},
  // 런타임 권한이 필요한 기능이 없어 비워둠
  permissions: [],
  webBundleDir: 'dist',
});
