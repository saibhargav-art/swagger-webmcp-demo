import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import webapiTemplate from '../api/webapi.template.json';
import { useAuth } from '../context/AuthContext';
import { adminToolHandlers, orderToolHandlers } from '../lib/supabaseApi';

type WebApiDocument = {
  paths?: Record<string, Record<string, WebApiOperationBase>>;
  components?: {
    schemas?: Record<string, Record<string, unknown>>;
  };
  'x-webmcp-ui'?: {
    routes?: Record<string, string>;
    actions?: Record<string, WebMcpUiAction>;
  };
};

type WebMcpUiAction = {
  route?: string;
  page?: string;
  fields?: Record<string, string[]>;
  submit?: string[];
  notes?: string;
};

type WebApiOperationBase = {
  method?: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    required?: boolean;
    description?: string;
    schema?: Record<string, unknown>;
  }>;
  requestBody?: {
    content?: {
      'application/json'?: {
        schema?: Record<string, unknown>;
      };
    };
  };
  'x-webmcp'?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
  };
};

type WebApiOperation = WebApiOperationBase & {
  method?: string;
};

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

const ROLE_ACCESS: Record<string, Set<string>> = {
  viewer: new Set(['searchOrders', 'listOrders', 'getOrderStatus']),
  support: new Set(['searchOrders', 'listOrders', 'getOrderStatus', 'createOrder', 'updateOrderStatus']),
  admin: new Set(['searchOrders', 'listOrders', 'getOrderStatus', 'createOrder', 'updateOrderStatus', 'deleteOrder', 'approveRefund', 'updateQuota']),
};

const TOOL_EXECUTORS: Record<string, (token: string, input: Record<string, unknown>) => Promise<unknown>> = {
  createOrder: (token, input) =>
    orderToolHandlers.createOrder(token, {
      customer_name: stringValue(input.customer_name),
      amount: numberValue(input.amount),
    }),
  updateOrderStatus: (token, input) =>
    orderToolHandlers.updateOrderStatus(token, {
      id: stringValue(input.id),
      status: String(input.status) as Parameters<typeof orderToolHandlers.updateOrderStatus>[1]['status'],
    }),
  searchOrders: (token, input) =>
    orderToolHandlers.searchOrders(token, {
      query: stringValue(input.query),
    }),
  listOrders: (token) => orderToolHandlers.listOrders(token),
  getOrderStatus: (token, input) =>
    orderToolHandlers.getOrderStatus(token, {
      id: stringValue(input.id),
    }),
  deleteOrder: (token, input) =>
    adminToolHandlers.deleteOrder(token, {
      id: stringValue(input.id),
    }),
  approveRefund: (token, input) =>
    adminToolHandlers.approveRefund(token, {
      id: stringValue(input.id),
    }),
  updateQuota: (token, input) =>
    adminToolHandlers.updateQuota(token, {
      user_id: stringValue(input.user_id),
      quota: numberValue(input.quota),
    }),
};

export function useWebMcpRegistration(): void {
  const { session, user } = useAuth();
  const location = useLocation();
  const accessToken = session?.access_token ?? '';
  const role = user?.role ?? null;

  const tools = useMemo(() => {
    if (!role) return [];
    return buildRegisteredTools(webapiTemplate as WebApiDocument, role, location.pathname, accessToken);
  }, [accessToken, location.pathname, role]);

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext?.registerTool || !accessToken || tools.length === 0) return;

    const controllers = tools.map((tool) => {
      const controller = new AbortController();
      void modelContext.registerTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
          execute: async (input: Record<string, unknown>) => tool.execute(input),
        },
        { signal: controller.signal },
      );
      return controller;
    });

    return () => {
      controllers.forEach((controller) => controller.abort());
    };
  }, [accessToken, tools]);
}

function buildRegisteredTools(contract: WebApiDocument, role: string, pathname: string, accessToken: string): RegisteredTool[] {
  const operations = collectOperations(contract);
  const currentRoleTools = ROLE_ACCESS[role] ?? ROLE_ACCESS.viewer;

  return operations
    .filter((operation) => hasRoleAccess(operation.operationId, currentRoleTools))
    .filter((operation) => shouldExposeOnRoute(contract, operation.operationId, pathname))
    .map((operation) => ({
      name: toolNameFromOperation(operation.operationId),
      description: describeOperation(operation),
      inputSchema: buildInputSchema(operation, contract),
      annotations: {
        readOnlyHint: operation['x-webmcp']?.readOnlyHint ?? isReadOnlyOperation(operation),
        untrustedContentHint: false,
      },
      execute: async (input) => {
        const executor = TOOL_EXECUTORS[operation.operationId];
        if (!executor) {
          throw new Error(`No browser tool executor is configured for ${operation.operationId}.`);
        }
        return executor(accessToken, input);
      },
    }));
}

function collectOperations(contract: WebApiDocument): Array<WebApiOperation & { operationId: string }> {
  const result: Array<WebApiOperation & { operationId: string; method: string }> = [];
  for (const [path, methods] of Object.entries(contract.paths ?? {})) {
    if (!methods || typeof methods !== 'object') continue;
    for (const [method, operation] of Object.entries(methods)) {
      if (!isHttpMethod(method) || !operation || typeof operation !== 'object') continue;
      const candidate = operation as WebApiOperation;
      const operationId = candidate.operationId ?? `${method}_${path}`;
      result.push({ ...candidate, operationId, method: method.toUpperCase() });
    }
  }
  return result;
}

function buildInputSchema(operation: WebApiOperation, contract: WebApiDocument): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required = new Set<string>();

  for (const parameter of operation.parameters ?? []) {
    properties[parameter.name] = {
      ...(parameter.schema ?? { type: 'string' }),
      description: parameter.description,
    };
    if (parameter.required || parameter.in === 'path') required.add(parameter.name);
  }

  const bodySchema = resolveSchema(operation.requestBody?.content?.['application/json']?.schema, contract);
  const bodyProperties = isRecord(bodySchema?.properties) ? bodySchema.properties : {};
  for (const [name, schema] of Object.entries(bodyProperties)) {
    properties[name] = resolveSchema(schema, contract) ?? (schema as Record<string, unknown>);
  }
  if (Array.isArray(bodySchema?.required)) {
    for (const name of bodySchema.required) required.add(String(name));
  }

  return {
    type: 'object',
    properties,
    required: [...required],
    additionalProperties: false,
  };
}

function resolveSchema(schema: unknown, contract: WebApiDocument): Record<string, unknown> | undefined {
  if (!isRecord(schema)) return undefined;
  const ref = schema.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/components/schemas/')) return schema;
  const schemaName = ref.replace('#/components/schemas/', '');
  const resolved = contract.components?.schemas?.[schemaName];
  return isRecord(resolved) ? resolved : (schema as Record<string, unknown>);
}

function shouldExposeOnRoute(contract: WebApiDocument, operationId: string, pathname: string): boolean {
  const actions = contract['x-webmcp-ui']?.actions ?? {};
  const action = actions[operationId];
  const route = action?.route ?? action?.page;
  if (!route) return true;
  const normalizedRoute = route.replace(/\/+$/, '') || '/';
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return normalizedPath === normalizedRoute || normalizedPath.startsWith(`${normalizedRoute}/`);
}

function hasRoleAccess(operationId: string, allowed: Set<string>): boolean {
  return allowed.has(operationId);
}

function isReadOnlyOperation(operation: WebApiOperation): boolean {
  if (operation['x-webmcp']?.readOnlyHint !== undefined) return operation['x-webmcp']?.readOnlyHint ?? false;
  return !['POST', 'PUT', 'PATCH', 'DELETE'].includes(operation.method ?? '');
}

function describeOperation(operation: WebApiOperation): string {
  const text = [operation.summary ?? operation.operationId, operation.description].filter(Boolean).join(' - ');
  return text.trim() || operation.operationId || 'Customer tool';
}

function toolNameFromOperation(operationId: string): string {
  return operationId.replace(/[^a-zA-Z0-9_]/g, '_');
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Enter a valid number.');
  return parsed;
}

function isHttpMethod(value: string): boolean {
  return ['get', 'post', 'put', 'patch', 'delete'].includes(value.toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
