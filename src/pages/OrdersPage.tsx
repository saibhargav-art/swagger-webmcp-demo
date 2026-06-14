import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { orderToolHandlers } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getOrders } from '../lib/supabaseApi';
import type { Order, OrderStatus, UserRole } from '../lib/types';

const editableStatuses: OrderStatus[] = ['pending', 'processing', 'fulfilled', 'cancelled'];


export default function OrdersPage() {
  const { session, user } = useAuth();
  // Call demo backend functions directly for normal app usage.
  // WebMCP is only used by AI agents; the React app uses the API handlers.
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');

  const canWrite = user?.role === 'support' || user?.role === 'admin';
  const canCreateOrder = canWrite;
  const canUpdateOrderStatus = canWrite;

  const loadOrders = async () => {
    if (!session) return;
    setLoading(true);
    try {
      setOrders(await getOrders(session.access_token));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [session?.access_token]);


  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return orders;
    return orders.filter((order) => `${order.id} ${order.customer_name} ${order.status}`.toLowerCase().includes(normalized));
  }, [orders, query]);

  const createOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) {
      toast('❌ Not signed in', 'error');
      return;
    }

    setBusy(true);

    const params = {
      customer_name: customerName,
      amount: Number(amount),
    };

    try {
      await orderToolHandlers.createOrder(session.access_token, params);
      setCustomerName('');
      setAmount('');
      toast('✅ Order created successfully', 'success');
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create order failed';
      toast(`❌ ${message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    if (!session) {
      toast('❌ Not signed in', 'error');
      return;
    }

    const params = { id, status };
    try {
      await orderToolHandlers.updateOrderStatus(session.access_token, params);
      toast('✅ Order status updated', 'success');
      await loadOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  const searchOrders = async () => {
    if (!session) {
      toast('❌ Not signed in', 'error');
      return;
    }

    const params = { query };
    try {
      const result = await orderToolHandlers.searchOrders(session.access_token, params);
      setOrders(result as Order[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user?.role ? `Signed in as ${user.role}. Available actions are based on your role.` : 'Sign in to view order history and actions.'}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search orders"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={searchOrders}
            title="Search orders (WebMCP will validate your permissions)"
          >
            Search
          </button>
        </div>
      </div>

      {canCreateOrder ? (
        <form className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_160px_auto]" onSubmit={createOrder}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Customer name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            min="0"
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400 disabled:text-slate-300"
            disabled={busy}
            title={canCreateOrder ? 'Create new order (WebMCP will validate your permissions)' : 'You do not have permission to create orders'}
          >
            Create order
          </button>
        </form>
      ) : (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          You do not have permission to create orders.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Order id</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={5}>Loading orders...</td></tr>
            ) : filteredOrders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                <td className="px-4 py-3">${order.amount.toFixed(2)}</td>
                <td className="px-4 py-3 capitalize">{order.status.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  {canUpdateOrderStatus ? (
                    <select
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={order.status}
                      onChange={(event) => void updateStatus(order.id, event.target.value as OrderStatus)}
                      title="Update order status (WebMCP will validate permissions)"
                    >
                      {editableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  ) : (
                    <span className="text-slate-600">Status: {order.status.replace('_', ' ')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

