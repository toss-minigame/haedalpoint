import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ── 임시 진단 로그 (debug/ad-log). 광고 실패 원인을 찾으면 지운다 ──
const LOG_PREFIX = '[광고]';

function adLog(...args: unknown[]): void {
  console.info(LOG_PREFIX, ...args);
}

/** SDK 가 돌려준 오류를 사람이 읽을 수 있게 (이름·메시지·코드·원본) */
function describeAdError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as Error & { code?: unknown }).code;
    return [error.name, error.message, code !== undefined ? `code=${String(code)}` : null]
      .filter(Boolean)
      .join(' · ');
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** 실패는 콘솔 + 화면 알림으로 남긴다 (토스 앱 안에서는 콘솔을 바로 볼 수 없어서) */
function adFail(stage: string, error: unknown): void {
  const reason = describeAdError(error);
  console.error(LOG_PREFIX, `${stage} 실패`, reason, error);
  toast.error(`${LOG_PREFIX} ${stage} 실패: ${reason}`, { duration: 10_000 });
}
// ── 임시 진단 로그 끝 ──

/**
 * - unsupported: 이 환경(토스 앱 버전·광고 ID 미설정)에서 광고를 쓸 수 없음
 * - loading: 미리 불러오는 중
 * - ready: 바로 보여줄 수 있음
 * - showing: 광고가 떠 있음
 * - failed: 불러오기 실패 (reload 로 재시도)
 */
export type RewardedAdStatus = 'unsupported' | 'loading' | 'ready' | 'showing' | 'failed';

export type ShowRewardedAdHandlers = {
  /** 광고를 끝까지 봤을 때(`userEarnedReward`)만 호출된다. 보상 처리는 여기서만 한다. */
  onReward: () => void;
  /** 광고가 닫혔을 때. earned 가 false 면 끝까지 보지 않고 닫은 것 */
  onClose?: (earned: boolean) => void;
  /** 광고를 띄우지 못했을 때 */
  onFail?: () => void;
};

export type RewardedAd = {
  status: RewardedAdStatus;
  show: (handlers: ShowRewardedAdHandlers) => void;
  reload: () => void;
};

function canUseFullScreenAd(adGroupId: string | null): adGroupId is string {
  return adGroupId !== null && loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
}

/**
 * 보상형 광고 1개를 화면 단위로 미리 불러와 두고, 필요할 때 보여준다.
 * 같은 광고 그룹은 한 번에 하나만 미리 불러올 수 있으므로 화면(페이지)에서 한 번만 호출하고
 * 여러 버튼이 이 결과를 함께 쓴다. 광고가 닫히면 다음 광고를 자동으로 다시 불러온다.
 *
 * 앱인토스 규약: load → loaded → show → dismissed → 다음 load.
 * 버튼을 누를 때 load 하지 않는다. 보상은 `userEarnedReward` 에서만 지급한다.
 */
export function useRewardedAd(adGroupId: string | null): RewardedAd {
  const isSupported = canUseFullScreenAd(adGroupId);
  const [status, setStatus] = useState<RewardedAdStatus>(isSupported ? 'loading' : 'unsupported');
  const [loadCount, setLoadCount] = useState(0);
  const showCleanupRef = useRef<(() => void) | null>(null);

  // 임시 진단: 빌드에 들어간 ID·모드와 토스 앱의 광고 지원 여부
  useEffect(() => {
    const info = {
      adGroupId,
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      loadSupported: loadFullScreenAd.isSupported(),
      showSupported: showFullScreenAd.isSupported(),
    };
    adLog('환경', info);
    toast.info(
      `${LOG_PREFIX} ID=${info.adGroupId ?? '없음'} · 모드=${info.mode} · 지원=${info.loadSupported}/${info.showSupported}`,
      { duration: 10_000 },
    );
  }, [adGroupId]);

  // 임시 진단: 버튼 상태가 왜 그런지
  useEffect(() => {
    adLog('상태', status);
  }, [status]);

  // loadCount 는 reload 트리거용 의존성
  useEffect(() => {
    if (!isSupported) return;
    setStatus('loading');
    adLog('불러오기 시작', { adGroupId, attempt: loadCount + 1 });
    const unregister = loadFullScreenAd({
      options: { adGroupId },
      onEvent: (event) => {
        adLog('불러오기 이벤트', event);
        if (event.type === 'loaded') setStatus('ready');
      },
      onError: (error) => {
        adFail('불러오기', error);
        setStatus('failed');
      },
    });
    return unregister;
  }, [adGroupId, isSupported, loadCount]);

  // 광고가 떠 있는 동안 화면을 벗어나면 콜백 등록을 해제한다
  useEffect(() => () => showCleanupRef.current?.(), []);

  const reload = useCallback(() => setLoadCount((count) => count + 1), []);

  const show = useCallback(
    ({ onReward, onClose, onFail }: ShowRewardedAdHandlers) => {
      if (!isSupported || status !== 'ready') return;
      setStatus('showing');

      let earned = false;
      const finish = () => {
        showCleanupRef.current?.();
        showCleanupRef.current = null;
        // 이미 보여준 광고는 다시 쓸 수 없으므로 다음 광고를 미리 불러온다
        reload();
      };

      adLog('띄우기 시작', { adGroupId });
      showCleanupRef.current = showFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          adLog('띄우기 이벤트', event);
          switch (event.type) {
            case 'userEarnedReward':
              earned = true;
              onReward();
              break;
            case 'dismissed':
              onClose?.(earned);
              finish();
              break;
            case 'failedToShow':
              adFail('띄우기(failedToShow)', event);
              onFail?.();
              finish();
              break;
          }
        },
        onError: (error) => {
          adFail('띄우기', error);
          onFail?.();
          finish();
        },
      });
    },
    [adGroupId, isSupported, status, reload],
  );

  return { status, show, reload };
}
