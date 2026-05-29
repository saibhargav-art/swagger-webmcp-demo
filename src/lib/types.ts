export type UserRole = 'admin' | 'support' | 'viewer';

export type OrderStatus = 'pending' | 'processing' | 'fulfilled' | 'cancelled' | 'refund_approved';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  quota: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  amount: number;
  status: OrderStatus;
  created_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_id: string | null;
  status: 'success' | 'denied' | 'error';
  message: string | null;
  created_at: string;
}

export interface Metrics {
  totalOrders: number;
  pendingOrders: number;
  approvedRefunds: number;
}
