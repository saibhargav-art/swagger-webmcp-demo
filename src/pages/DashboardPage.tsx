import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMetrics } from '../lib/supabaseApi';
import type { Metrics } from '../lib/types';

export default function DashboardPage() {
  const { session, user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMetrics(session.access_token)
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load metrics'));
  }, [session]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Current order operations and authenticated user context.</p>
      </div>

      {error && <div className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total orders" value={metrics?.totalOrders} />
        <MetricCard label="Pending orders" value={metrics?.pendingOrders} />
        <MetricCard label="Approved refunds" value={metrics?.approvedRefunds} />
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Authenticated user</h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
          <Info label="Email" value={user?.email} />
          <Info label="Role" value={user?.role} />
          <Info label="Quota" value={String(user?.quota ?? '')} />
        </dl>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value ?? '...'}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium capitalize text-slate-950">{value || 'Unknown'}</dd>
    </div>
  );
}
