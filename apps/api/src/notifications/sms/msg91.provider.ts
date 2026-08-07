import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsProvider, SmsSendResult } from './sms-provider.interface';

/**
 * MSG91 SMS provider. Uses the MSG91 "sendhttp" API (India-focused, no template DLT
 * flow required for a plain transactional message). Reads credentials from env —
 * never hardcoded. If MSG91_AUTH_KEY is not configured, `send` short-circuits to a
 * recorded failure instead of making a network call or throwing, so booking creation
 * is never blocked by a missing/invalid SMS configuration.
 */
@Injectable()
export class Msg91Provider implements SmsProvider {
  readonly name = 'msg91';
  private readonly logger = new Logger(Msg91Provider.name);

  constructor(private config: ConfigService) {}

  async send(to: string, message: string): Promise<SmsSendResult> {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const senderId = this.config.get<string>('MSG91_SENDER_ID');

    if (!authKey || !senderId) {
      const error = 'MSG91_AUTH_KEY / MSG91_SENDER_ID not configured';
      this.logger.warn(`SMS not sent (${error}). Recipient: ${to}`);
      return { success: false, error };
    }

    const digitsOnly = to.replace(/[^0-9]/g, '');
    const mobile = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

    try {
      const url = new URL('https://api.msg91.com/api/sendhttp.php');
      url.searchParams.set('authkey', authKey);
      url.searchParams.set('mobiles', mobile);
      url.searchParams.set('message', message);
      url.searchParams.set('sender', senderId);
      url.searchParams.set('route', '4');
      url.searchParams.set('country', '91');
      url.searchParams.set('response', 'json');

      const res = await fetch(url.toString(), { method: 'GET' });
      const text = await res.text();

      if (!res.ok) {
        return { success: false, error: `MSG91 HTTP ${res.status}: ${text}` };
      }

      // MSG91 sendhttp returns either a bare message-id string or a JSON error payload.
      try {
        const parsed = JSON.parse(text);
        if (parsed?.type === 'error') {
          return { success: false, error: parsed.message || 'MSG91 rejected the request' };
        }
      } catch {
        // not JSON — treat as a plain message-id response, which indicates success
      }

      return { success: true, providerMessageId: text.trim() };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown MSG91 network error';
      this.logger.error(`MSG91 send failed: ${error}`);
      return { success: false, error };
    }
  }
}
