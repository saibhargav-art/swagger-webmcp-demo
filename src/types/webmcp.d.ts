import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: boolean;
    toolparamdescription?: string;
  }

  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }

  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }

  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: WebMcpToolDefinition,
        options?: { signal?: AbortSignal },
      ) => Promise<WebMcpRegisteredTool> | WebMcpRegisteredTool;
      getTools?: () => Promise<WebMcpRegisteredTool[]> | WebMcpRegisteredTool[];
      executeTool?: (name: string, input?: Record<string, unknown>) => Promise<unknown>;
    };
  }

  interface Window {
    modelContext?: Document['modelContext'];
  }
}

interface WebMcpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  execute?: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface WebMcpRegisteredTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export {};
