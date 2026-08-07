import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SmsService } from './sms/sms.service';
import { Msg91Provider } from './sms/msg91.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsService, Msg91Provider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
