import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { executeSwaggerTool, useRouteTools } from '@bhargav/swagger-webmcp/react';
import webMcpSpec from '../api/webmcp-openapi.json';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabaseUrl } from '../lib/config';
import { getOrders } from '../lib/supabaseApi';
import type { Order, OrderStatus, UserRole } from '../lib/types';

const editableStatuses: OrderStatus[] = ['pending', 'processing', 'fulfilled', 'cancelled'];

/**
 * Log only rejected tool executions.
 */
function logToolInvocation(
  toolName: string,
  action: string,
  params: Record<string, unknown>,
  error: unknown
) {
  console.warn('[swagger-webmcp] Tool rejected', {
    tool: toolName,
    action,
    params,
    error: error instanceof Error ? error.message : String(error),
  });
}

export default function OrdersPage() {
  const { session, user } = useAuth();
  const routeToolScopeKey = `orders:${session?.user.id || 'anonymous'}:${user?.role || 'unknown'}`;
  const orderToolTags = getOrderToolTags();
  const auth = React.useMemo(
    () =>
      session
        ? {
          type: 'bearer' as const,
          token: session.access_token,
        }
        : undefined,
    [session?.access_token]
  );

  const tools = useRouteTools(
    {
      key: routeToolScopeKey,
      tags: orderToolTags,
      allowedScopes: getOrderAllowedScopes(user?.role),
      requiredRoles: user?.role ? [user.role] : undefined,
      scopeRegistrationMode: 'discovery',
      secureMode: true,
    },
    {
      spec: webMcpSpec,
      baseUrl: `${supabaseUrl}/functions/v1`,
      auth,
    }
  );
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [showPermissions, setShowPermissions] = useState(false);

  const canWrite = user?.role === 'support' || user?.role === 'admin';
  const canCreateOrder = tools.authorizedNames.includes('createOrder');
  const canUpdateOrderStatus = tools.authorizedNames.includes('updateOrderStatus');

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
      console.warn('[Tool Invocation] createOrder blocked: not signed in');
      return;
    }

    setBusy(true);

    const params = {
      customer_name: customerName,
      amount: Number(amount),
    };

    try {
      await executeSwaggerTool('createOrder', params);
      setCustomerName('');
      setAmount('');
      toast('✅ Order created successfully', 'success');
      await loadOrders();
    } catch (err) {
      logToolInvocation('createOrder', 'POST', params, err);
      const message = err instanceof Error ? err.message : 'Create order failed';
      toast(`❌ ${message}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    if (!session) {
      toast('❌ Not signed in', 'error');
      console.warn('[Tool Invocation] updateOrderStatus blocked: not signed in');
      return;
    }

    const params = { id, status };
    try {
      await executeSwaggerTool('updateOrderStatus', params);
      toast('✅ Order status updated', 'success');
      await loadOrders();
    } catch (err) {
      logToolInvocation('updateOrderStatus', 'POST', params, err);
      const message = err instanceof Error ? err.message : 'Update failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  const searchOrders = async () => {
    if (!session) {
      toast('❌ Not signed in', 'error');
      console.warn('[Tool Invocation] searchOrders blocked: not signed in');
      return;
    }

    const params = { query };
    try {
      const result = await executeSwaggerTool('searchOrders', params);
      setOrders(result as Order[]);
    } catch (err) {
      logToolInvocation('searchOrders', 'POST', params, err);
      const message = err instanceof Error ? err.message : 'Search failed';
      toast(`❌ ${message}`, 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">{getToolSummary()}</p>
          <ToolRegistrationStatus loading={tools.loading} error={tools.error} count={tools.registeredNames.length} />
          {tools.diagnostics?.permissionSummary ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Permission summary</p>
              <p>{tools.diagnostics.permissionSummary}</p>
            </div>
          ) : null}
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
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={order.status}
                    disabled={!canUpdateOrderStatus}
                    onChange={(event) => void updateStatus(order.id, event.target.value as OrderStatus)}
                    title={canUpdateOrderStatus ? 'Update order status (WebMCP will validate permissions)' : 'You do not have permission to update order status'}
                  >
                    {editableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getOrderAllowedScopes(role?: UserRole) {
  if (role === 'support' || role === 'admin') return ['orders:read', 'orders:write'];
  return ['orders:read'];
}

function getOrderToolTags() {
  return ['orders:read', 'orders:write'];
}

function getToolSummary() {
  return 'Route-scoped WebMCP tools: createOrder, searchOrders, updateOrderStatus.';
}

function ToolRegistrationStatus({ loading, error, count }: { loading: boolean; error: Error | null; count: number }) {
  if (loading) return <p className="mt-2 text-xs font-medium text-amber-700">Registering order tools...</p>;
  if (error) return <p className="mt-2 text-xs font-medium text-rose-700">Tool registration failed: {error.message}</p>;
  return <p className="mt-2 text-xs font-medium text-emerald-700">{count} order tools registered for this route.</p>;
}
