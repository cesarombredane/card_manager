// import utils
import { dirname, resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';

export const project_root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const data_root = join(project_root, 'frontend/data');
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Json_Object = { [key: string]: Json };
export function object(value: unknown): value is Json_Object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function read_json<T>(path: string, fallback?: T): T {
  if (!existsSync(path) && fallback !== undefined) return fallback;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
export function write_json(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}
export function directories(path: string): string[] {
  return existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(path, entry.name))
        .sort(compare)
    : [];
}
export function files(path: string, suffix: string, recursive = false): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? recursive
          ? files(join(path, entry.name), suffix, true)
          : []
        : entry.name.endsWith(suffix)
          ? [join(path, entry.name)]
          : [],
    )
    .sort(compare);
}
export function set_paths(root: string): string[] {
  return directories(root)
    .map((path) => join(path, 'sets.json'))
    .filter(existsSync);
}
// Match Python's Unicode code-point ordering rather than the host locale.
export function compare(left: string, right: string): number {
  const a = Array.from(left),
    b = Array.from(right);
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const difference = a[index].codePointAt(0)! - b[index].codePointAt(0)!;
    if (difference) return difference;
  }
  return a.length - b.length;
}
export function run_command(command: string[], cwd = project_root): string {
  return execFileSync(command[0], command.slice(1), {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}
export function cli(
  options: Record<string, { type: 'boolean' | 'string'; default?: string | boolean }>,
  args = process.argv.slice(2),
): Record<string, string | boolean | undefined> {
  return parseArgs({
    args,
    options: { ...options, help: { type: 'boolean', short: 'h' } },
    strict: true,
  }).values;
}
export function is_main(url: string): boolean {
  return !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url);
}
export async function entry(main: () => number | Promise<number>): Promise<void> {
  try {
    process.exitCode = await main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode =
      err instanceof TypeError && 'code' in err && String(err.code).startsWith('ERR_PARSE_ARGS')
        ? 2
        : 1;
  }
}
