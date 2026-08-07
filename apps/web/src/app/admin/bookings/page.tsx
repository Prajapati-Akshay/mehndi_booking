'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { formatDate, formatINR } from '@/lib/utils';
import type { Booking } from '@/lib/types';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const query = filter === 'ALL' ? '' : `?status=${filter}`;
      const data = await api.get<Booking[]>(`/bookings${query}`, token);
      setBookings(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function updateStatus(id: string, status: string) {
    const token = getToken();
    if (!token) return;
    setBusyId(id);
    try {
      await api.patch(`/bookings/${id}/status`, { status }, token);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl text-forest-900">Bookings</h1>
      <p className="text-sm text-forest-800/60 mt-1">Review, confirm and manage customer bookings.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium border ${
              filter === s ? 'bg-forest-800 text-ivory border-forest-800' : 'border-gold-200 text-forest-800/70'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {loading && <p className="text-sm text-forest-800/50">Loading…</p>}
        {!loading && bookings.length === 0 && <p className="text-sm text-forest-800/50">No bookings found.</p>}
        {bookings.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-forest-900">{b.customer.fullName} · {b.bookingNumber}</p>
                <p className="text-xs text-forest-800/60 mt-1">
                  {b.service.category.name} — {b.service.name} ({b.pricing.lengthLabel})
                </p>
                <p className="text-xs text-forest-800/60 mt-1">
                  {formatDate(b.appointmentDate)} · {b.appointmentTime} · {b.numberOfPeople} people
                </p>
                <p className="text-xs text-forest-800/60 mt-1">
                  📞 {b.customer.phone} {b.customer.email ? `· ${b.customer.email}` : ''}
                </p>
                {b.notes && <p className="text-xs text-forest-800/50 mt-1">Notes: {b.notes}</p>}
              </div>
              <div className="text-right">
                <Badge status={b.status}>{b.status}</Badge>
                <p className="mt-2 text-sm font-medium text-forest-900">{formatINR(b.totalAmount)}</p>
                <p className="text-xs text-forest-800/50">Advance {formatINR(b.advanceAmount)}</p>
              </div>
            </div>
            {TRANSITIONS[b.status]?.length > 0 && (
              <div className="mt-4 flex gap-2">
                {TRANSITIONS[b.status].map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={next === 'REJECTED' || next === 'CANCELLED' ? 'outline' : 'primary'}
                    disabled={busyId === b.id}
                    onClick={() => updateStatus(b.id, next)}
                  >
                    Mark {next.charAt(0) + next.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
