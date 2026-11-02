import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from '../../../common/decorators/current-user-id.decorator';
import { AuthGuard } from '../auth.guard';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SECRET = 'test-secret-test-secret-test-secret!!';

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const jwtService = new JwtService({
    secret: SECRET,
    signOptions: { algorithm: 'HS256', expiresIn: 3600 },
    verifyOptions: { algorithms: ['HS256'] },
  });
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new AuthGuard(reflector as unknown as Reflector, jwtService);

  beforeEach(() => {
    jest.resetAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  function requestWith(authorization?: string): Partial<AuthenticatedRequest> {
    return { headers: authorization ? { authorization } : {} };
  }

  it('lets @Public() routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextFor(requestWith()))).resolves.toBe(true);
  });

  it('attaches the user id from a valid bearer token', async () => {
    const token = await jwtService.signAsync({ sub: USER_ID });
    const request = requestWith(`Bearer ${token}`);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.userId).toBe(USER_ID);
  });

  it.each([
    ['missing header', undefined],
    ['non-bearer scheme', 'Basic abc'],
    ['empty bearer', 'Bearer '],
    ['malformed token', 'Bearer not-a-jwt'],
  ])('rejects %s with 401', async (_label, authorization) => {
    await expect(guard.canActivate(contextFor(requestWith(authorization)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await new JwtService({ secret: 'another-secret-another-secret-123' }).signAsync({
      sub: USER_ID,
    });

    await expect(guard.canActivate(contextFor(requestWith(`Bearer ${forged}`)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    const expired = await jwtService.signAsync({ sub: USER_ID }, { expiresIn: -1 });

    await expect(guard.canActivate(contextFor(requestWith(`Bearer ${expired}`)))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token whose subject is not a user id', async () => {
    const token = await jwtService.signAsync({ sub: 'anon-key-value' });

    await expect(guard.canActivate(contextFor(requestWith(`Bearer ${token}`)))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
