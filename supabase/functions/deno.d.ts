declare namespace Deno {
  interface ServeOptions {
    port?: number;
    hostname?: string;
  }

  namespace env {
    function get(key: string): string | undefined;
    function set(key: string, value: string): void;
    function delete(key: string): void;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;

  function serve(
    options: ServeOptions,
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(url: string, key: string): any;
}
