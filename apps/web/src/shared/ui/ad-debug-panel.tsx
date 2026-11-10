import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { getAdLogLines, subscribeAdLog } from '@/shared/lib/rewarded-ad';

// ── 임시 진단 화면 (광고 불러오기 실패 원인을 찾으면 지운다) ──
// 토스 앱 안에서는 콘솔을 볼 수 없어서 광고 로그를 화면 왼쪽 아래에 띄우고 통째로 복사할 수 있게 한다.

/** 클립보드 API 가 막힌 webview 를 위해 textarea 선택 복사로 한 번 더 시도한다 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

export function AdDebugPanel() {
  const lines = useSyncExternalStore(subscribeAdLog, getAdLogLines);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    const copied = await copyText(lines.join('\n'));
    if (copied) toast.success('광고 로그를 복사했어요');
    else toast.error('복사하지 못했어요. 로그 글자를 길게 눌러 직접 선택해 주세요');
  };

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-[100] flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2">
      {isOpen && (
        <div className="flex max-h-[60vh] w-[calc(100vw-2rem)] max-w-xl flex-col gap-2 rounded-xl bg-black/90 p-3 text-white">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="h-11 flex-1 rounded-lg bg-white text-[15px] font-semibold text-black"
            >
              전체 복사 ({lines.length}줄)
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-11 rounded-lg bg-white/20 px-4 text-[15px] font-semibold"
            >
              닫기
            </button>
          </div>
          <pre className="overflow-auto text-[13px] leading-snug whitespace-pre-wrap break-all select-text">
            {lines.length > 0 ? lines.join('\n') : '아직 기록이 없어요'}
          </pre>
        </div>
      )}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-11 rounded-full bg-black/85 px-4 text-[15px] font-semibold text-white"
        >
          광고 로그 {lines.length}줄
        </button>
      )}
    </div>
  );
}
