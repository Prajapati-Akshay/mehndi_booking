import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';

const TEST_DB_PATH = path.join(__dirname, '..', '..', 'prisma', 'test-conflict.db');
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

describe('BookingsService — double-booking protection', () => {
  let prisma: PrismaClient;
  let service: BookingsService;
  let notifications: NotificationsService;
  let pricingId: string;
  let serviceId: string;
  let timeSlotId: string;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });

    prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
    await prisma.$connect();

    const category = await prisma.serviceCategory.create({
      data: { slug: 'test-category', name: 'Test Category' },
    });
    const svc = await prisma.service.create({
      data: { categoryId: category.id, name: 'Test Service' },
    });
    serviceId = svc.id;
    const pricing = await prisma.servicePricing.create({
      data: { serviceId: svc.id, lengthLabel: 'Test Tier', price: 200, whatsIncluded: 'Test' },
    });
    pricingId = pricing.id;

    // Mirror BookingsService's own startOfDay() exactly (parse "YYYY-MM-DD" then
    // setHours(0,0,0,0) in local time) so this fixture's availability.date lines up
    // with what create() compares against.
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const tomorrowLocalMidnight = new Date(tomorrowStr);
    tomorrowLocalMidnight.setHours(0, 0, 0, 0);
    const availability = await prisma.availability.create({
      data: { date: tomorrowLocalMidnight, isAvailable: true },
    });
    const slot = await prisma.timeSlot.create({
      data: { availabilityId: availability.id, startTime: '10:00', endTime: '11:00' },
    });
    timeSlotId = slot.id;

    notifications = {
      notifyBookingCreated: jest.fn().mockResolvedValue(undefined),
      notifyBookingConfirmed: jest.fn().mockResolvedValue(undefined),
      notifyBookingRejected: jest.fn().mockResolvedValue(undefined),
      notifyBookingCancelled: jest.fn().mockResolvedValue(undefined),
      notifyBookingCompleted: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    service = new BookingsService(prisma as unknown as PrismaService, notifications);
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split('T')[0];

  it('creates the first booking successfully with correct per-person pricing', async () => {
    const booking = await service.create({
      serviceId,
      pricingId,
      timeSlotId,
      numberOfPeople: 3,
      appointmentDate: tomorrow(),
      appointmentTime: '10:00-11:00',
      fullName: 'First Customer',
      phoneNumber: '9111111111',
      whatsappNumber: '9111111111',
      termsAccepted: true,
    });

    expect(booking.pricePerPerson).toBe(200);
    expect(booking.totalAmount).toBe(600);
    expect(booking.advanceAmount).toBe(300);
    expect(booking.remainingAmount).toBe(300);
    expect(notifications.notifyBookingCreated).toHaveBeenCalled();
  });

  it('rejects a second booking for the same slot with HTTP 409 ConflictException', async () => {
    await expect(
      service.create({
        serviceId,
        pricingId,
        timeSlotId,
        numberOfPeople: 1,
        appointmentDate: tomorrow(),
        appointmentTime: '10:00-11:00',
        fullName: 'Second Customer',
        phoneNumber: '9222222222',
        whatsappNumber: '9222222222',
        termsAccepted: true,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
