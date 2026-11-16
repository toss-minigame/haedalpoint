// 로컬 개발용 가짜 앱인토스 파트너 API (mTLS 없음, http)
//
// 브라우저 개발(devtools mock)에서는 User.createAnonymousKeyAuthCode() 가 가짜 코드를 주므로
// 실제 파트너 API 로 교환할 수 없다. 서버 코드에 우회 분기를 두는 대신, 서버의
// TOSS_PARTNER_API_BASE_URL 을 이 서버로 바꿔 실제 교환·응답 봉투 처리 코드를 그대로 돌린다.
// production 은 env 검증이 공식 주소만 허용한다.
//
// 실행: pnpm --filter @haedalpoint/api dev:fake-partner
//   FAKE_PARTNER_PORT  (기본 3100)
//   FAKE_ANON_KEY      돌려줄 익명키. 바꾸면 다른 테스트 사용자가 된다 (기본 local-dev-anon-key)
//   'invalid' 로 시작하는 코드는 4011(코드 무효)로 거부한다
//
// 프로모션(토스 포인트 지급)도 흉내 낸다: get-key → execute-promotion → execution-result.
// 지급한 키는 메모리에만 두고 바로 SUCCESS 로 답한다 (서버를 다시 띄우면 지급 내역이 사라진다).
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const EXCHANGE_PATH = '/api-partner/v1/apps-in-toss/users/anon-key/exchange';
const PROMOTION_GET_KEY_PATH = '/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key';
const PROMOTION_EXECUTE_PATH = '/api-partner/v1/apps-in-toss/promotion/execute-promotion';
const PROMOTION_RESULT_PATH = '/api-partner/v1/apps-in-toss/promotion/execution-result';
const port = Number(process.env.FAKE_PARTNER_PORT ?? 3100);
const anonKey = process.env.FAKE_ANON_KEY || 'local-dev-anon-key';

if (process.env.NODE_ENV === 'production') {
  console.error('fake-toss-partner: production 에서는 실행할 수 없습니다');
  process.exit(1);
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function fail(errorCode, reason) {
  return { resultType: 'FAIL', error: { errorCode, reason } };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

/** 발급한 지급 키 → 지급 금액 (아직 지급 전이면 null) */
const promotionKeys = new Map();

async function handlePromotion(req, res) {
  if (!req.headers['x-anon-key']) {
    send(res, 200, fail('4010', '인증 정보를 찾을 수 없어요.'));
    return;
  }
  const body = await readJson(req);
  if (req.url === PROMOTION_GET_KEY_PATH) {
    const key = Buffer.from(randomUUID()).toString('base64');
    promotionKeys.set(key, null);
    send(res, 200, { resultType: 'SUCCESS', success: { key } });
    return;
  }
  const key = typeof body?.key === 'string' ? body.key : '';
  if (!promotionKeys.has(key)) {
    send(res, 200, fail('4111', '리워드 지급내역을 찾을 수 없어요'));
    return;
  }
  if (req.url === PROMOTION_RESULT_PATH) {
    if (promotionKeys.get(key) === null) {
      send(res, 200, fail('4111', '리워드 지급내역을 찾을 수 없어요'));
      return;
    }
    send(res, 200, { resultType: 'SUCCESS', success: 'SUCCESS' });
    return;
  }
  if (promotionKeys.get(key) !== null) {
    send(res, 200, fail('4113', '이미 지급/회수된 내역이에요'));
    return;
  }
  promotionKeys.set(key, body.amount);
  console.log(
    `fake-toss-partner: 토스 포인트 ${body.amount}원 지급 (promotionCode=${body.promotionCode})`,
  );
  send(res, 200, { resultType: 'SUCCESS', success: { key } });
}

const PROMOTION_PATHS = [PROMOTION_GET_KEY_PATH, PROMOTION_EXECUTE_PATH, PROMOTION_RESULT_PATH];

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && PROMOTION_PATHS.includes(req.url)) {
    await handlePromotion(req, res);
    return;
  }
  if (req.method !== 'POST' || req.url !== EXCHANGE_PATH) {
    send(res, 404, fail('NOT_FOUND', `${req.method} ${req.url} 은 가짜 파트너 API 에 없습니다`));
    return;
  }

  const body = await readJson(req);
  const code = typeof body?.code === 'string' ? body.code : '';
  if (!code) {
    send(res, 400, fail('INVALID_PARAMETER', 'code 가 필요해요'));
    return;
  }
  if (code.startsWith('invalid')) {
    send(res, 200, fail('4011', '익명 사용자 인증 코드가 유효하지 않아요.'));
    return;
  }
  send(res, 200, { resultType: 'SUCCESS', success: { anonKey } });
});

server.listen(port, () => {
  console.log(`fake-toss-partner: http://localhost:${port} (anonKey=${anonKey})`);
});
