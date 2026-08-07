import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import type { ServiceCategory } from '@/lib/types';
import { BookingWizard } from './booking-wizard';

export const metadata: Metadata = {
  title: 'Book Appointment',
  description: 'Book your Mehndi appointment with Mehndi By Dhara in a few simple steps.',
};

async function getCategories() {
  try {
    return await api.get<ServiceCategory[]>('/services/categories');
  } catch {
    return [];
  }
}

export default async function BookingPage() {
  const categories = await getCategories();

  return (
    <div className="container py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-gold-500 text-sm tracking-widest uppercase font-medium">Book Now</span>
        <h1 className="section-heading mt-3">Reserve Your Mehndi Appointment</h1>
        <p className="mt-4 text-forest-800/70">Follow the steps below — it only takes a minute.</p>
      </div>

      {categories.length === 0 ? (
        <p className="text-center mt-16 text-forest-700/60">
          Booking is temporarily unavailable. Please contact us on WhatsApp to book directly.
        </p>
      ) : (
        <Suspense fallback={null}>
          <BookingWizard categories={categories} />
        </Suspense>
      )}
    </div>
  );
}
