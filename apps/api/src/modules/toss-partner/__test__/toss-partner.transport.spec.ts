import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createPartnerTransport } from '../toss-partner.transport.js';

const noCredentials = () => null;

interface Captured {
  method?: string;
  url?: string;
  contentType?: string;
  body: string;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

describe('createPartnerTransport', () => {
  let server: Server;
  let baseUrl: string;
  let captured: Captured;
  let reply: { status: number; body: string };

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      captured = {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        body: await readBody(req),
      };
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(reply.body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('sends JSON to the path and parses the JSON response', async () => {
    reply = { status: 200, body: JSON.stringify({ resultType: 'SUCCESS', success: { a: 1 } }) };
    const transport = createPartnerTransport({
      baseUrl,
      loadCredentials: noCredentials,
      timeoutMs: 1000,
    });

    const response = await transport({ method: 'POST', path: '/x/y', body: { code: 'c' } });

    expect(captured).toEqual({
      method: 'POST',
      url: '/x/y',
      contentType: 'application/json',
      body: '{"code":"c"}',
    });
    expect(response).toEqual({ status: 200, body: { resultType: 'SUCCESS', success: { a: 1 } } });
  });

  it('returns body null for a non-JSON response', async () => {
    reply = { status: 502, body: '<html>bad gateway</html>' };
    const transport = createPartnerTransport({
      baseUrl,
      loadCredentials: noCredentials,
      timeoutMs: 1000,
    });

    await expect(transport({ method: 'GET', path: '/x' })).resolves.toEqual({
      status: 502,
      body: null,
    });
  });

  it('refuses https calls when the mTLS certificate is not configured', async () => {
    const transport = createPartnerTransport({
      baseUrl: 'https://apps-in-toss-api.toss.im',
      loadCredentials: noCredentials,
      timeoutMs: 1000,
    });

    await expect(transport({ method: 'POST', path: '/x', body: {} })).rejects.toThrow(
      'TOSS_MTLS_CERT_PATH',
    );
  });
});
