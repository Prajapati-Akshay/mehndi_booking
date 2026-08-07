import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms/sms.service';

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED';

interface BookingNotificationContext {
  id: string;
  bookingNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  totalAmount: number;
  advanceAmount: number;
  customer: { fullName: string; phone: string };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const TEMPLATES: Record<NotificationType, (b: BookingNotificationContext) => string> = {
  BOOKING_CREATED: (b) =>
    `Hi ${b.customer.fullName}, your Mehndi By Dhara booking request #${b.bookingNumber} has been received for ${formatDate(b.appointmentDate)} at ${b.appointmentTime}. Our team will confirm your booking shortly.`,
  BOOKING_CONFIRMED: (b) =>
    `Hi ${b.customer.fullName}, your Mehndi By Dhara booking #${b.bookingNumber} is confirmed for ${formatDate(b.appointmentDate)} at ${b.appointmentTime}. Total: ₹${b.totalAmount}. Advance: ₹${b.advanceAmount}. Thank you!`,
  BOOKING_REJECTED: (b) =>
    `Hi ${b.customer.fullName}, your Mehndi By Dhara booking #${b.bookingNumber} could not be confirmed. Please contact us for another available slot.`,
  BOOKING_CANCELLED: (b) =>
    `Hi ${b.customer.fullName}, your Mehndi By Dhara booking #${b.bookingNumber} has been cancelled. Please contact us for further assistance.`,
  BOOKING_COMPLETED: (b) =>
    `Hi ${b.customer.fullName}, thank you for choosing Mehndi By Dhara for booking #${b.bookingNumber}! We hope you loved your Mehndi.`,
};

/**
 * Orchestrates outbound booking notifications. Every send attempt is logged as a
 * Notification row (PENDING -> SENT|FAILED). A failed or throwing send is always
 * swallowed here — this service must never throw, since callers (BookingsService)
 * invoke it after their DB transaction has already committed.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService, private sms: SmsService) {}

  private async dispatch(booking: BookingNotificationContext, type: NotificationType) {
    const message = TEMPLATES[type](booking);
    const recipient = booking.customer.phone;

    const notification = await this.prisma.notification.create({
      data: {
        bookingId: booking.id,
        type,
        channel: 'SMS',
        recipient,
        message,
        status: 'PENDING',
        provider: this.sms.providerName,
      },
    });

    try {
      const result = await this.sms.sendSms(recipient, message);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: result.success
          ? { status: 'SENT', providerMessageId: result.providerMessageId }
          : { status: 'FAILED', errorMessage: result.error },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown notification error';
      this.logger.error(`Notification dispatch failed for booking ${booking.bookingNumber}: ${errorMessage}`);
      await this.prisma.notification
        .update({ where: { id: notification.id }, data: { status: 'FAILED', errorMessage } })
        .catch(() => undefined);
    }
  }

  async notifyBookingCreated(booking: BookingNotificationContext) {
    await this.dispatch(booking, 'BOOKING_CREATED').catch(() => undefined);
  }

  async notifyBookingConfirmed(booking: BookingNotificationContext) {
    await this.dispatch(booking, 'BOOKING_CONFIRMED').catch(() => undefined);
  }

  async notifyBookingRejected(booking: BookingNotificationContext) {
    await this.dispatch(booking, 'BOOKING_REJECTED').catch(() => undefined);
  }

  async notifyBookingCancelled(booking: BookingNotificationContext) {
    await this.dispatch(booking, 'BOOKING_CANCELLED').catch(() => undefined);
  }

  async notifyBookingCompleted(booking: BookingNotificationContext) {
    await this.dispatch(booking, 'BOOKING_COMPLETED').catch(() => undefined);
  }
}
