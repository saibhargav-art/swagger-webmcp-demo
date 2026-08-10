import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminToolHandlers, getOrders, orderToolHandlers } from '../lib/supabaseApi';
import type { AppUser, AuthSession, OrderStatus, UserRole } from '../lib/types';

type ToolAnnotations = {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
};

type ToolRegistration = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: ToolAnnotations;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  registerTool: (
    tool: ToolRegistration,
    options?: {
      signal?: AbortSignal;
      exposedTo?: string[];
    },
  ) => Promise<void> | void;
};

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

const DEFAULT_EXPOSED_ORIGINS = import.meta.env.DEV
  ? ['http://localhost:5173', 'http://127.0.0.1:5173']
  : [];

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'searchOrders',
    description: 'Search orders by customer, status, order id, or free text.',
    routePrefixes: ['/orders', '/dashboard', '/admin'],
    roles: ['viewer', 'support', 'admin'],
    readOnlyHint: true,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Customer name, status, order id, or search text',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => orderToolHandlers.searchOrders(session.access_token, {
      query: asString(input.query, 'query'),
    }),
  },
  {
    name: 'listOrders',
    description: 'List the latest orders for filtering, counting, comparison, and duplicate analysis.',
    routePrefixes: ['/dashboard', '/orders', '/admin'],
    roles: ['viewer', 'support', 'admin'],
    readOnlyHint: true,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    execute: async ({ session }) => getOrders(session.access_token),
  },
  {
    name: 'createOrder',
    description: 'Create a customer order from the orders page.',
    routePrefixes: ['/orders'],
    roles: ['support', 'admin'],
    readOnlyHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'Customer or account name',
        },
        amount: {
          type: 'number',
          description: 'Order amount in dollars',
        },
      },
      required: ['customer_name', 'amount'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => orderToolHandlers.createOrder(session.access_token, {
      customer_name: asString(input.customer_name, 'customer_name'),
      amount: asNumber(input.amount, 'amount'),
    }),
  },
  {
    name: 'getOrderStatus',
    description: 'Get one order by UUID after resolving it from search or list results.',
    routePrefixes: ['/orders', '/admin'],
    roles: ['viewer', 'support', 'admin'],
    readOnlyHint: true,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Order UUID',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => orderToolHandlers.getOrderStatus(session.access_token, {
      id: asString(input.id, 'id'),
    }),
  },
  {
    name: 'updateOrderStatus',
    description: 'Update the status of an existing order selected by UUID.',
    routePrefixes: ['/orders'],
    roles: ['support', 'admin'],
    readOnlyHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Order UUID',
        },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'fulfilled', 'cancelled'],
          description: 'New order status',
        },
      },
      required: ['id', 'status'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => orderToolHandlers.updateOrderStatus(session.access_token, {
      id: asString(input.id, 'id'),
      status: asOrderStatus(input.status),
    }),
  },
  {
    name: 'updateQuota',
    description: 'Update a customer quota from the admin page.',
    routePrefixes: ['/admin'],
    roles: ['admin'],
    readOnlyHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'Application user UUID',
        },
        quota: {
          type: 'number',
          description: 'New quota value',
        },
      },
      required: ['user_id', 'quota'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => adminToolHandlers.updateQuota(session.access_token, {
      user_id: asString(input.user_id, 'user_id'),
      quota: asNumber(input.quota, 'quota'),
    }),
  },
  {
    name: 'deleteOrder',
    description: 'Permanently delete an order selected by UUID.',
    routePrefixes: ['/admin'],
    roles: ['admin'],
    readOnlyHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Order UUID',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => adminToolHandlers.deleteOrder(session.access_token, {
      id: asString(input.id, 'id'),
    }),
  },
  {
    name: 'approveRefund',
    description: 'Approve the refund for an order selected by UUID.',
    routePrefixes: ['/admin'],
    roles: ['admin'],
    readOnlyHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Order UUID',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    execute: async ({ session }, input) => adminToolHandlers.approveRefund(session.access_token, {
      id: asString(input.id, 'id'),
    }),
  },
];

export function useWebMcpRegistration(): void {
  const { session, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!session?.access_token || !user) return;
    const context = document.modelContext;
    if (!context?.registerTool) return;

    const controllers = new Set<AbortController>();
    const tools = TOOL_DEFINITIONS.filter((tool) => isToolVisible(tool, user, location.pathname));
    if (tools.length === 0) return;

    for (const definition of tools) {
      const controller = new AbortController();
      controllers.add(controller);

      void context.registerTool(
        {
          name: definition.name,
          description: definition.description,
          inputSchema: definition.inputSchema,
          annotations: definition.readOnlyHint !== undefined
            ? { readOnlyHint: definition.readOnlyHint, untrustedContentHint: true }
            : { untrustedContentHint: true },
          execute: async (input) => definition.execute({ session, user }, asRecord(input)),
        },
        {
          signal: controller.signal,
          exposedTo: DEFAULT_EXPOSED_ORIGINS.length > 0 ? DEFAULT_EXPOSED_ORIGINS : undefined,
        },
      );
    }

    return () => {
      for (const controller of controllers) controller.abort();
    };
  }, [location.pathname, session, user]);
}

type ToolDefinition = {
  name: string;
  description: string;
  routePrefixes: string[];
  roles: UserRole[];
  readOnlyHint: boolean;
  inputSchema: Record<string, unknown>;
  execute: (context: { session: AuthSession; user: AppUser }, input: Record<string, unknown>) => Promise<unknown>;
};

function isToolVisible(tool: ToolDefinition, user: AppUser, pathname: string): boolean {
  return tool.roles.includes(user.role) && tool.routePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, name: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  throw new Error(`Missing required field: ${name}`);
}

function asOrderStatus(value: unknown): OrderStatus {
  if (value === 'pending' || value === 'processing' || value === 'fulfilled' || value === 'cancelled') return value;
  throw new Error('Missing or invalid order status.');
}

function asNumber(value: unknown, name: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Missing or invalid field: ${name}`);
  }
  return parsed;
}
