'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { getToken } from '@/lib/admin-auth';
import type { ServiceCategory } from '@/lib/types';

interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  category: { id: string; name: string };
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ categoryId: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [svc, cats] = await Promise.all([
        api.get<ServiceRow[]>('/services', token),
        api.get<ServiceCategory[]>('/services/categories'),
      ]);
      setServices(svc);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(id: string, isActive: boolean) {
    const token = getToken();
    if (!token) return;
    await api.patch(`/services/${id}`, { isActive: !isActive }, token);
    await load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setCreating(true);
    setError('');
    try {
      await api.post('/services', form, token);
      setForm({ categoryId: '', name: '', description: '' });
      await load();
    } catch {
      setError('Could not create service. Check the fields and try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminShell>
      <h1 className="font-serif text-2xl text-forest-900">Services</h1>
      <p className="text-sm text-forest-800/60 mt-1">Manage the services offered under each category.</p>

      <Card className="mt-6 p-6">
        <h2 className="font-medium text-forest-900 mb-4">Add New Service</h2>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-3 gap-3">
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="rounded-xl border border-gold-200 px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            required
            placeholder="Service name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-gold-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl border border-gold-200 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={creating} className="sm:col-span-3 justify-self-start">
            {creating ? 'Adding…' : 'Add Service'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-forest-900 text-ivory text-left">
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {loading && <tr><td colSpan={4} className="px-5 py-6 text-center text-forest-800/50">Loading…</td></tr>}
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-cream/60">
                  <td className="px-5 py-3 text-forest-800/70">{s.category.name}</td>
                  <td className="px-5 py-3 font-medium text-forest-900">{s.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(s.id, s.isActive)}>
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
