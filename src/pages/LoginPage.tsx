import React, { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/config';

export default function LoginPage() {
  const { login, session, user } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-soft lg:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-slate-950 p-8 text-white lg:p-12">
          <div className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Secure WebMCP Demo</div>
          <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-tight">AI Order Management Portal</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Authenticated browser sessions, protected backend actions, RBAC, and route-scoped tools for AI agents.
          </p>
          <div className="mt-10 grid gap-3 text-sm text-slate-300">
            <div className="rounded-md border border-white/10 bg-white/5 p-4">Viewer: read-only order access</div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4">Support: create and update orders</div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4">Admin: refunds, quotas, and deletes</div>
          </div>
        </section>

        <form className="p-8 lg:p-12" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use one of the seeded Supabase users from the setup notes.</p>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Supabase environment variables are not configured.
            </div>
          )}

          {error && <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

          <label className="mt-6 block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>

          <button
            className="mt-6 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
