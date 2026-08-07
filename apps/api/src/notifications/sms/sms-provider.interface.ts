export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/** Abstraction so the SMS vendor can be swapped without touching NotificationsService. */
export interface SmsProvider {
  readonly name: string;
  send(to: string, message: string): Promise<SmsSendResult>;
}
