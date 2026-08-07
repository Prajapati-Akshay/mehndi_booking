'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';

interface CustomerRow {
  id: string;
  fullName: string;
  phone: string;
  whatsappNumber: string;
  email: string | null;
  address: string | null;
  bookings: { id: string }[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api
      .get<CustomerRow[]>('/customers', token)
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl text-forest-900">Customers</h1>
      <p className="text-sm text-forest-800/60 mt-1">All customers who have made a booking.</p>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-forest-900 text-ivory text-left">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {loading && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-forest-800/50">Loading…</td></tr>
              )}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-center text-forest-800/50">No customers yet.</td></tr>
              )}
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-cream/60">
                  <td className="px-5 py-3 font-medium text-forest-900">{c.fullName}</td>
                  <td className="px-5 py-3 text-forest-800/70">{c.phone}</td>
                  <td className="px-5 py-3 text-forest-800/70">{c.email ?? '—'}</td>
                  <td className="px-5 py-3 text-forest-800/70">{c.address ?? '—'}</td>
                  <td className="px-5 py-3 text-forest-800/70">{c.bookings.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
