import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { adEnvironment, adLog, describeError, inspectAdGroupId } from './ad-debug-log';

// 임시 진단: 실패하면 화면의 '광고 로그' 창을 열어 복사하도록 안내한다
function notifyAdFailure(stage: string): void {
  toast.error(`[광고] ${stage} 실패 · 왼쪽 아래 '광고 로그'를 눌러 전체 복사해 주세요`, {
    duration: 15_000,
  });
}

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

/**
 * 앱을 연 직후(약 0.1초)에 불러오면 토스 앱이 EXECUTION_ERROR [1017] 로 바로 거절한다
 * (토스 앱의 광고 기능이 아직 준비되지 않은 것으로 보임). 0.5초 늦추면 된다는 보고가 있었고,
 * 기기마다 준비 시간이 달라 여유를 두고 1.5초로 늘렸다. 화면에서 처음 불러올 때 이만큼 기다린다.
 */
const FIRST_LOAD_DELAY_MS = 1_500;
/** 불러오기가 실패하면 '다시 시도'를 보여주기 전에 자동으로 다시 불러오는 간격 (기기마다 준비 시간이 달라서) */
const AUTO_RETRY_DELAYS_MS = [1_000, 2_000] as const;

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
  // 임시 진단: 앞선 불러오기가 이벤트를 받기 전에 또 불렀는지
  const pendingLoadRef = useRef(false);
  /** 지금까지 자동으로 다시 불러온 횟수. 성공하거나 사용자가 다시 시도하면 0 */
  const autoRetryCountRef = useRef(0);

  // 임시 진단: 실행 환경과 광고 그룹 ID 상태, 지원 여부
  useEffect(() => {
    adLog('환경', {
      ...adEnvironment(),
      adGroupId: inspectAdGroupId(adGroupId),
      loadSupported: loadFullScreenAd.isSupported(),
      showSupported: showFullScreenAd.isSupported(),
    });
  }, [adGroupId]);

  // 임시 진단: 버튼 상태가 왜 그런지
  useEffect(() => {
    adLog('상태', status);
  }, [status]);

  // loadCount 는 reload 트리거용 의존성
  useEffect(() => {
    if (!isSupported) return;
    setStatus('loading');
    const options = { adGroupId };
    const autoRetry = autoRetryCountRef.current;
    const delayMs =
      autoRetry > 0
        ? (AUTO_RETRY_DELAYS_MS[autoRetry - 1] ?? 0)
        : loadCount === 0
          ? FIRST_LOAD_DELAY_MS
          : 0;
    let unregister: (() => void) | null = null;

    const load = () => {
      adLog('불러오기 호출', {
        attempt: loadCount + 1,
        autoRetry,
        delayMs,
        previousLoadStillPending: pendingLoadRef.current,
        options,
      });
      pendingLoadRef.current = true;
      unregister = loadFullScreenAd({
        options,
        onEvent: (event) => {
          pendingLoadRef.current = false;
          adLog('불러오기 이벤트', event);
          if (event.type === 'loaded') {
            autoRetryCountRef.current = 0;
            setStatus('ready');
          }
        },
        onError: (error) => {
          pendingLoadRef.current = false;
          adLog('불러오기 실패', describeError(error));
          if (autoRetryCountRef.current < AUTO_RETRY_DELAYS_MS.length) {
            autoRetryCountRef.current += 1;
            adLog('자동으로 다시 불러오기', { autoRetry: autoRetryCountRef.current });
            setLoadCount((count) => count + 1);
            return;
          }
          notifyAdFailure('불러오기');
          setStatus('failed');
        },
      });
    };

    const timer = window.setTimeout(load, delayMs);
    return () => {
      window.clearTimeout(timer);
      if (unregister) {
        adLog('불러오기 콜백 해제', { attempt: loadCount + 1 });
        unregister();
      }
    };
  }, [adGroupId, isSupported, loadCount]);

  // 광고가 떠 있는 동안 화면을 벗어나면 콜백 등록을 해제한다
  useEffect(() => () => showCleanupRef.current?.(), []);

  const reload = useCallback(() => {
    adLog('다시 불러오기 요청');
    autoRetryCountRef.current = 0;
    setLoadCount((count) => count + 1);
  }, []);

  const show = useCallback(
    ({ onReward, onClose, onFail }: ShowRewardedAdHandlers) => {
      adLog('띄우기 요청', { isSupported, status });
      if (!isSupported || status !== 'ready') return;
      setStatus('showing');

      let earned = false;
      const finish = () => {
        showCleanupRef.current?.();
        showCleanupRef.current = null;
        // 이미 보여준 광고는 다시 쓸 수 없으므로 다음 광고를 미리 불러온다
        reload();
      };

      const options = { adGroupId };
      adLog('띄우기 호출', { options });
      showCleanupRef.current = showFullScreenAd({
        options,
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
              notifyAdFailure('띄우기(failedToShow)');
              onFail?.();
              finish();
              break;
          }
        },
        onError: (error) => {
          adLog('띄우기 실패', describeError(error));
          notifyAdFailure('띄우기');
          onFail?.();
          finish();
        },
      });
    },
    [adGroupId, isSupported, status, reload],
  );

  return { status, show, reload };
}
