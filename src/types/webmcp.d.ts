declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: WebMcpToolDefinition,
        options?: { signal?: AbortSignal },
      ) => Promise<WebMcpRegisteredTool> | WebMcpRegisteredTool;
      getTools?: () => Promise<WebMcpRegisteredTool[]> | WebMcpRegisteredTool[];
      executeTool?: (tool: WebMcpRegisteredTool, input: string) => Promise<unknown>;
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
