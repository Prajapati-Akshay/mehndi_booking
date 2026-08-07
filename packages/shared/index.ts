export const BUSINESS = {
  name: 'Mehndi By Dhara',
  instagramHandle: '@mehndibydhara',
  instagramUrl: 'https://instagram.com/mehndibydhara',
  whatsapp: '916358290268',
  phone: '6358290268',
} as const;

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum Role {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const SERVICE_CATEGORIES = [
  'ARABIC_MEHNDI',
  'DESIGNER_FANCY_MEHNDI',
  'INDIAN_TRADITIONAL',
  'ENGAGEMENT_MEHNDI',
  'BRIDAL_MEHNDI',
  'FEET_MEHNDI',
] as const;

export type ServiceCategorySlug = (typeof SERVICE_CATEGORIES)[number];
