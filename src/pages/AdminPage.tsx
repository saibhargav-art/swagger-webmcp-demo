import React, { useEffect, useState } from 'react';
import { adminToolHandlers } from '../lib/supabaseApi';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../lib/supabaseApi';
import type { Order } from '../lib/types';

export default function AdminPage() {
  const { session, user } = useAuth();
  // Use demo backend handlers directly for normal admin actions.
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotaUserId, setQuotaUserId] = useState('');
  const [quota, setQuota] = useState('25');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!session) return;
    setOrders(await getOrders(session.access_token));
  };

  useEffect(() => {
    void loadOrders();
  }, [session?.access_token]);


  const approveRefund = async (id: string) => {
    if (!session) {
      toast('❌ Not signed in', 'error');
      return;
    }

    const params = { id };
    try {
      await adminToolHandlers.approveRefund(session.access_token, params);
      toast('✅ Refund approved', 'success');
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund approval failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  const deleteOrder = async () => {
    if (!session || !deleteId) {
      const message = !session ? 'Not signed in' : 'No order selected';
      toast(`❌ ${message}`, 'error');
      return;
    }

    const params = { id: deleteId };
    try {
      await adminToolHandlers.deleteOrder(session.access_token, params);
      toast('✅ Order deleted', 'success');
      setDeleteId(null);
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  const updateQuota = async () => {
    if (!session) {
      toast('❌ Not signed in', 'error');
      return;
    }

    const params = { user_id: quotaUserId, quota: Number(quota) };
    try {
      await adminToolHandlers.updateQuota(session.access_token, params);
      toast('✅ Customer quota updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Quota update failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-950">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user?.role === 'admin'
            ? 'Only admin users may perform admin tool actions.'
            : 'You need admin access to manage orders and quotas.'}
        </p>
      </div>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold">Update customer quota</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="User id" value={quotaUserId} onChange={(event) => setQuotaUserId(event.target.value)} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" value={quota} onChange={(event) => setQuota(event.target.value)} />
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={updateQuota}
            title="Update quota (WebMCP will validate your permissions)"
          >
            Update quota
          </button>
        </div>
      </section>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Admin actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                <td className="px-4 py-3">${order.amount.toFixed(2)}</td>
                <td className="px-4 py-3 capitalize">{order.status.replace('_', ' ')}</td>
                <td className="flex gap-2 px-4 py-3">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => void approveRefund(order.id)}
                    title="Approve refund (WebMCP will validate your permissions)"
                  >
                    Approve refund
                  </button>
                  <button
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                    onClick={() => setDeleteId(order.id)}
                    title="Delete order (WebMCP will validate your permissions)"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete order"
        body="This permanently deletes the order. The edge function will revalidate admin permissions before executing."
        confirmLabel="Delete order"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void deleteOrder()}
      />
    </div>
  );
}

