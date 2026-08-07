'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import { formatINR } from '@/lib/utils';

interface PricingRow {
  id: string;
  lengthLabel: string;
  price: number;
  whatsIncluded: string;
  isActive: boolean;
  service: { id: string; name: string; category: { name: string } };
}

interface ServiceOption {
  id: string;
  name: string;
  category: { name: string };
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { price: number; whatsIncluded: string }>>({});
  const [form, setForm] = useState({ serviceId: '', lengthLabel: '', price: '', whatsIncluded: '' });
  const [creating, setCreating] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [pricing, svc] = await Promise.all([
        api.get<PricingRow[]>('/pricing', token),
        api.get<ServiceOption[]>('/services', token),
      ]);
      setRows(pricing);
      setServices(svc);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(row: PricingRow) {
    setEditing({ ...editing, [row.id]: { price: row.price, whatsIncluded: row.whatsIncluded } });
  }

  async function saveEdit(id: string) {
    const token = getToken();
    if (!token || !editing[id]) return;
    await api.patch(`/pricing/${id}`, editing[id], token);
    const next = { ...editing };
    delete next[id];
    setEditing(next);
    await load();
  }

  async function remove(id: string) {
    const token = getToken();
    if (!token) return;
    await api.delete(`/pricing/${id}`, token);
    await load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setCreating(true);
    try {
      await api.post('/pricing', { ...form, price: Number(form.price) }, token);
      setForm({ serviceId: '', lengthLabel: '', price: '', whatsIncluded: '' });
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl text-forest-900">Pricing</h1>
      <p className="text-sm text-forest-800/60 mt-1">Manage price tiers shown to customers.</p>

      <Card className="mt-6 p-6">
        <h2 className="font-medium text-forest-900 mb-4">Add New Price Tier</h2>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            required
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="rounded-xl border border-gold-200 px-3 py-2 text-sm"
          >
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.category.name} — {s.name}</option>
            ))}
          </select>
          <input required placeholder="Length label" value={form.lengthLabel} onChange={(e) => setForm({ ...form, lengthLabel: e.target.value })} className="rounded-xl border border-gold-200 px-3 py-2 text-sm" />
          <input required type="number" placeholder="Price (₹)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-gold-200 px-3 py-2 text-sm" />
          <input required placeholder="What's included" value={form.whatsIncluded} onChange={(e) => setForm({ ...form, whatsIncluded: e.target.value })} className="rounded-xl border border-gold-200 px-3 py-2 text-sm" />
          <Button type="submit" disabled={creating} className="lg:col-span-4 justify-self-start">
            {creating ? 'Adding…' : 'Add Price Tier'}
          </Button>
        </form>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-forest-900 text-ivory text-left">
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Length</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Included</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {loading && <tr><td colSpan={5} className="px-5 py-6 text-center text-forest-800/50">Loading…</td></tr>}
              {rows.map((row) => {
                const edit = editing[row.id];
                return (
                  <tr key={row.id} className="hover:bg-cream/60">
                    <td className="px-5 py-3 text-forest-800/70">{row.service.category.name} — {row.service.name}</td>
                    <td className="px-5 py-3 font-medium text-forest-900">{row.lengthLabel}</td>
                    <td className="px-5 py-3">
                      {edit ? (
                        <input
                          type="number"
                          value={edit.price}
                          onChange={(e) => setEditing({ ...editing, [row.id]: { ...edit, price: Number(e.target.value) } })}
                          className="w-24 rounded-lg border border-gold-200 px-2 py-1 text-sm"
                        />
                      ) : (
                        formatINR(row.price)
                      )}
                    </td>
                    <td className="px-5 py-3 text-forest-800/70">
                      {edit ? (
                        <input
                          value={edit.whatsIncluded}
                          onChange={(e) => setEditing({ ...editing, [row.id]: { ...edit, whatsIncluded: e.target.value } })}
                          className="w-full rounded-lg border border-gold-200 px-2 py-1 text-sm"
                        />
                      ) : (
                        row.whatsIncluded
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {edit ? (
                        <Button size="sm" onClick={() => saveEdit(row.id)}>Save</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>Delete</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
