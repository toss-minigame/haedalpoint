import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { TossPartnerClient } from './toss-partner.client';
import { createPartnerTransport, PARTNER_TRANSPORT } from './toss-partner.transport';

const PARTNER_TIMEOUT_MS = 5000;

@Module({
  providers: [
    TossPartnerClient,
    {
      provide: PARTNER_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createPartnerTransport({
          baseUrl: config.get('TOSS_PARTNER_API_BASE_URL', { infer: true }),
          certPath: config.get('TOSS_MTLS_CERT_PATH', { infer: true }),
          keyPath: config.get('TOSS_MTLS_KEY_PATH', { infer: true }),
          timeoutMs: PARTNER_TIMEOUT_MS,
        }),
    },
  ],
  exports: [TossPartnerClient],
})
export class TossPartnerModule {}
