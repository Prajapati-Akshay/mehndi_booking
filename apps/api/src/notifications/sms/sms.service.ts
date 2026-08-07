import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Msg91Provider } from './msg91.provider';
import type { SmsProvider, SmsSendResult } from './sms-provider.interface';

/** Resolves the configured SMS provider (SMS_PROVIDER env) and exposes a single sendSms(). */
@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor(private config: ConfigService, msg91: Msg91Provider) {
    const providerName = this.config.get<string>('SMS_PROVIDER') || 'msg91';
    // MSG91 is the only provider implemented today; the map keeps this open for
    // adding another SmsProvider implementation later without touching call sites.
    const providers: Record<string, SmsProvider> = { msg91 };
    this.provider = providers[providerName] ?? msg91;
  }

  get providerName(): string {
    return this.provider.name;
  }

  async sendSms(to: string, message: string): Promise<SmsSendResult> {
    return this.provider.send(to, message);
  }
}
