// import utils
import { mkdirSync, openSync, writeSync, closeSync } from 'node:fs';
import { dirname } from 'node:path';

let transcript: number | undefined;
export function color(
  text: string,
  code: string,
  stream: NodeJS.WriteStream = process.stdout,
): string {
  return stream.isTTY &&
    !('NO_COLOR' in process.env) &&
    process.env.TERM !== 'dumb' &&
    transcript === undefined
    ? `\x1b[${code}m${text}\x1b[0m`
    : text;
}
export function output(message: string, error = false): void {
  if (transcript !== undefined) writeSync(transcript, message);
  (error ? process.stderr : process.stdout).write(message);
}
export function log(message: string, error = false): void {
  const code = error
    ? /warning/i.test(message)
      ? '33'
      : '31'
    : /complete|ready/i.test(message)
      ? '32'
      : '0';
  output(
    `  ${color(message.replace(/^\s+|\n+$/g, ''), code, error ? process.stderr : process.stdout)}\n`,
    error,
  );
}
export function title(label: string): void {
  output(`\n${color(label, '1;36')}\n`);
}
export function duration(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(seconds / 60),
    hours = Math.floor(minutes / 60);
  return hours
    ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m`
    : minutes
      ? `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
      : `${seconds}s`;
}
export async function capture_run_log<T>(path: string, run: () => Promise<T>): Promise<T> {
  mkdirSync(dirname(path), { recursive: true });
  transcript = openSync(path, 'w');
  try {
    return await run();
  } finally {
    closeSync(transcript);
    transcript = undefined;
  }
}
export class Progress {
  private started = performance.now();
  private last_rendered = -Infinity;
  private completed = 0;
  private details = '';
  private interactive =
    !!process.stdout.isTTY && process.env.TERM !== 'dumb' && transcript === undefined;
  constructor(
    private label: string,
    private total: number,
  ) {
    this.update(0, '', true);
  }
  update(completed: number, details = '', force = false): void {
    this.completed = completed;
    this.details = details;
    const now = performance.now();
    if (!force && now - this.last_rendered < (this.interactive ? 100 : 10000)) return;
    this.last_rendered = now;
    const elapsed = (now - this.started) / 1000,
      ratio = this.total ? completed / this.total : 1;
    const suffix = `${completed.toLocaleString('en-US')}/${this.total.toLocaleString('en-US')} ${Math.round(ratio * 100)}% | ${duration(elapsed)} | ETA ${completed ? duration((elapsed * (this.total - completed)) / completed) : '--'}${details ? ` | ${details}` : ''}`;
    if (this.interactive) {
      const width = Math.max(
        6,
        Math.min(24, (process.stdout.columns || 80) - suffix.length - this.label.length - 8),
      );
      const filled = Math.floor(width * ratio);
      output(
        `\r\x1b[2K  ${this.label} [${color('='.repeat(filled), '36')}${' '.repeat(width - filled)}] ${suffix}`,
      );
    } else output(`  ${this.label}: ${suffix}\n`);
  }
  close(): void {
    this.update(this.completed, this.details, true);
    if (this.interactive) output('\n');
  }
}
