import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// 전역 인증 Guard 를 건너뛰는 경로 표시 (인증 발급, 헬스체크 등)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
