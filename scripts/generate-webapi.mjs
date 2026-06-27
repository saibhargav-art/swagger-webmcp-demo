import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env');
const templatePath = path.join(root, 'src', 'api', 'webapi.template.json');
const outputs = [
  path.join(root, 'public', 'webapi.json'),
  path.join(root, 'src', 'api', 'webapi.json'),
];

function parseEnv(raw) {
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        if (index === -1) return [line, ''];
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, '')];
      })
  );
}

if (!existsSync(envPath)) {
  throw new Error('Missing .env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before generating webapi.json.');
}

const env = parseEnv(await readFile(envPath, 'utf8'));
const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/+$/g, '');
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.');
}

const spec = JSON.parse(await readFile(templatePath, 'utf8'));
spec.servers = [
  {
    url: `${supabaseUrl}/functions/v1`,
    description: 'Supabase Edge Functions backend for WebMCP tool execution',
  },
];
spec['x-webmcp-headers'] = {
  apikey: anonKey,
};

const json = `${JSON.stringify(spec, null, 2)}\n`;
for (const output of outputs) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, json);
}

console.log(`Generated webapi.json for ${supabaseUrl}`);
