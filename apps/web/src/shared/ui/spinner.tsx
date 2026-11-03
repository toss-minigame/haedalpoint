import { Loader2Icon } from 'lucide-react';

/** 버튼 안에서 처리 중임을 보여주는 회전 아이콘. 문구가 함께 있으므로 스크린리더에는 숨긴다 */
export function Spinner() {
  return <Loader2Icon className="animate-spin" aria-hidden="true" />;
}
