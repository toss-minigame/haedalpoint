import { BadGatewayException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TossPartnerClient, TossPartnerError } from '../../toss-partner/toss-partner.client.js';
import { UsersService } from '../../users/users.service.js';
import { AuthService } from '../auth.service.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SECRET = 'test-secret-test-secret-test-secret!!';

describe('AuthService', () => {
  let service: AuthService;
  const jwtService = new JwtService({ secret: SECRET, signOptions: { expiresIn: 3600 } });
  const tossPartnerClient = { exchangeAnonAuthCode: jest.fn() };
  const usersService = { findOrCreateByAnonKey: jest.fn() };
  const config = { get: jest.fn().mockReturnValue(3600) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: TossPartnerClient, useValue: tossPartnerClient },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('exchanges the code, links the user and issues a token for the internal user id', async () => {
    tossPartnerClient.exchangeAnonAuthCode.mockResolvedValue('anon-1');
    usersService.findOrCreateByAnonKey.mockResolvedValue({ id: USER_ID, anonKey: 'anon-1' });

    const result = await service.loginWithAnonAuthCode('code-1');

    expect(tossPartnerClient.exchangeAnonAuthCode).toHaveBeenCalledWith('code-1');
    expect(usersService.findOrCreateByAnonKey).toHaveBeenCalledWith('anon-1');
    expect(result.expiresIn).toBe(3600);
    const payload = await jwtService.verifyAsync<Record<string, unknown>>(result.accessToken);
    expect(payload.sub).toBe(USER_ID);
    // 토스 식별자는 토큰에 넣지 않는다
    expect(JSON.stringify(payload)).not.toContain('anon-1');
  });

  it('rejects with 401 when the code is invalid (4011)', async () => {
    tossPartnerClient.exchangeAnonAuthCode.mockRejectedValue(
      new TossPartnerError(200, '4011', 'invalid'),
    );

    await expect(service.loginWithAnonAuthCode('bad')).rejects.toThrow(UnauthorizedException);
    expect(usersService.findOrCreateByAnonKey).not.toHaveBeenCalled();
  });

  it('rejects with 502 on other partner failures without exposing the reason', async () => {
    tossPartnerClient.exchangeAnonAuthCode.mockRejectedValue(
      new TossPartnerError(200, '4095', 'rate limited'),
    );

    const error = await service.loginWithAnonAuthCode('code-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadGatewayException);
    expect((error as Error).message).not.toContain('rate limited');
  });

  it('rejects with 502 on transport errors', async () => {
    tossPartnerClient.exchangeAnonAuthCode.mockRejectedValue(new Error('TLS handshake failed'));

    await expect(service.loginWithAnonAuthCode('code-1')).rejects.toThrow(BadGatewayException);
  });
});
