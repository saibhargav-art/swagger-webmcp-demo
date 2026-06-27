import { requireSupabaseConfig } from './config';
import type { ActivityLog, AppUser, AuthSession, Metrics, Order, OrderStatus } from './types';

const SESSION_KEY = 'ai-order-portal.session';

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function storeSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getJwtSubject(token: string) {
  const [, payload] = token.split('.');
  if (!payload) return '';
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  const decoded = JSON.parse(window.atob(normalized)) as { sub?: string };
  return decoded.sub || '';
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', supabaseAnonKey);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${supabaseUrl}${path}`, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || data?.error || data?.message || 'Request failed');
  }

  return data as T;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  storeSession(session);
  return session;
}

export async function signOut(token: string) {
  await request('/auth/v1/logout', { method: 'POST' }, token);
  storeSession(null);
}

export async function getProfile(token: string): Promise<AppUser> {
  const userId = getJwtSubject(token);
  const rows = await request<AppUser[]>(
    `/rest/v1/users?select=id,email,full_name,role,quota,created_at&id=eq.${userId}`,
    { headers: { Prefer: 'return=representation' } },
    token
  );

  if (!rows[0]) throw new Error('No application profile found for this account');
  return rows[0];
}

export async function getOrders(token: string): Promise<Order[]> {
  return request<Order[]>('/rest/v1/orders?select=*&order=created_at.desc', {}, token);
}

export async function getActivityLogs(token: string): Promise<ActivityLog[]> {
  return request<ActivityLog[]>('/rest/v1/activity_logs?select=*&order=created_at.desc&limit=100', {}, token);
}

export async function getMetrics(token: string): Promise<Metrics> {
  const orders = await getOrders(token);
  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === 'pending').length,
    approvedRefunds: orders.filter((order) => order.status === 'refund_approved').length,
  };
}

async function invokeFunction<T>(name: string, token: string, body: unknown): Promise<T> {
  return request<T>(`/functions/v1/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export const orderToolHandlers = {
  createOrder: (token: string, payload: { customer_name: string; amount: number }) =>
    invokeFunction<Order>('create-order', token, payload),
  updateOrderStatus: (token: string, payload: { id: string; status: OrderStatus }) =>
    invokeFunction<Order>('update-order-status', token, payload),
  searchOrders: (token: string, payload: { query: string }) =>
    invokeFunction<Order[]>('search-orders', token, payload),
  listOrders: (token: string) =>
    invokeFunction<Order[]>('list-orders', token, {}),
  getOrderStatus: (token: string, payload: { id: string }) =>
    invokeFunction<Pick<Order, 'id' | 'customer_name' | 'amount' | 'status' | 'created_at'>>('get-order-status', token, payload),
};

export const adminToolHandlers = {
  deleteOrder: (token: string, payload: { id: string }) =>
    invokeFunction<{ ok: true }>('delete-order', token, payload),
  approveRefund: (token: string, payload: { id: string }) =>
    invokeFunction<Order>('approve-refund', token, payload),
  updateQuota: (token: string, payload: { user_id: string; quota: number }) =>
    invokeFunction<AppUser>('update-quota', token, payload),
};
