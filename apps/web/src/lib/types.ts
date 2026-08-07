export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PricingTier {
  id: string;
  lengthLabel: string;
  price: number;
  whatsIncluded: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  pricingTiers: PricingTier[];
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  services: Service[];
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface Availability {
  id: string;
  date: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  appointmentDate: string;
  appointmentTime: string;
  eventType: string | null;
  numberOfPeople: number;
  notes: string | null;
  pricePerPerson: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    whatsappNumber: string;
    email: string | null;
    address: string | null;
  };
  pricing: PricingTier;
  service: {
    id: string;
    name: string;
    category: { id: string; name: string; slug: string };
  };
}

/** Slim shape returned directly by POST /bookings (see docs/PLAN.md §4). */
export interface CreateBookingResult {
  bookingId: string;
  bookingNumber: string;
  status: Booking['status'];
  pricePerPerson: number;
  numberOfPeople: number;
  totalAmount: number;
  advanceAmount: number;
  remainingAmount: number;
  appointmentDate: string;
  appointmentTime: string;
}

export interface Testimonial {
  id: string;
  customerName: string;
  message: string;
  rating: number;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string | null;
  category: string | null;
}

export interface DashboardData {
  totals: {
    totalBookings: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    rejected: number;
  };
  revenue: number;
  upcomingAppointments: Booking[];
  recentBookings: Booking[];
}
