import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { project_root, cli, is_main, entry } from './scripts/runtime';
import { personal_data_files } from './scripts/catalog_storage';
import { capture_run_log, duration, log, title, output } from './scripts/update_logging';
export class Stage_Error extends Error {
  constructor(public code: number) {
    super(`Stage failed with exit code ${code}`);
  }
}
export type Stage = { label: string; script?: string; args?: string[]; validate?: boolean };
export function stages(prices: boolean, reset: boolean): Stage[] {
  return [
    ...(prices
      ? []
      : [
          { label: '1. Updating the TCGdex source checkout', script: 'scripts/fetch_tcgdex.ts' },
          {
            label: '2. Updating catalog data',
            script: 'scripts/update_tcgdex_data.ts',
            args: reset ? ['--overwrite'] : [],
          },
        ]),
    { label: 'Refreshing Cardmarket prices', script: 'scripts/update_cardmarket_prices.ts' },
    ...(prices
      ? []
      : [
          { label: '4. Updating images', script: 'scripts/update_tcgdex_images.ts' },
          {
            label: '5. Generating the final coverage report',
            script: 'scripts/report_coverage.ts',
          },
        ]),
    { label: 'Validating the application', validate: true },
  ];
}
export function preserve_personal_data(root = project_root): Map<string, Buffer> {
  return new Map(
    personal_data_files
      .map((name) => join(root, 'frontend/data', name))
      .filter(existsSync)
      .map((path) => [path, readFileSync(path)]),
  );
}
export function restore_personal_data(files: Map<string, Buffer>): void {
  for (const [path, bytes] of files) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.update-data.tmp`, bytes);
    renameSync(`${path}.update-data.tmp`, path);
  }
}
export function reset_generated_caches(root = project_root): void {
  for (const name of ['cards', 'sets'])
    rmSync(join(root, 'frontend/public/images', name), { recursive: true, force: true });
  for (const name of [
    'frontend/public/images/.tcgdex-missing-assets.json',
    'tcgdex_data/cardmarket-price-guide.json',
  ])
    rmSync(join(root, name), { force: true });
}
export async function run_stage(
  label: string,
  command: string[],
  cwd = project_root,
): Promise<void> {
  title(label);
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    // The shell combines stderr/stdout at the OS pipe, preserving their order.
    const child = spawn('sh', ['-c', 'exec "$@" 2>&1', 'card-manager-stage', ...command], {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    const interrupt = () => child.kill('SIGINT');
    process.on('SIGINT', interrupt);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => output(chunk));
    child.stderr.on('data', (chunk: string) => output(chunk));
    child.on('error', (err) => {
      process.off('SIGINT', interrupt);
      reject(err);
    });
    child.on('close', (code, signal) => {
      process.off('SIGINT', interrupt);
      if (code === 0) resolve();
      else reject(new Stage_Error(signal === 'SIGINT' ? 130 : code || 1));
    });
  });
  log(`Stage complete in ${duration((performance.now() - started) / 1000)}`);
}
export async function pipeline(
  prices: boolean,
  reset: boolean,
  root = project_root,
  execute = run_stage,
): Promise<number> {
  const started = performance.now(),
    personal = reset ? preserve_personal_data(root) : new Map<string, Buffer>();
  try {
    for (const stage of stages(prices, reset)) {
      const command = stage.validate
        ? ['npm', 'run', 'typecheck']
        : [process.execPath, '--import', 'tsx', join(root, stage.script!), ...(stage.args || [])];
      await execute(stage.label, command, stage.validate ? join(root, 'frontend') : root);
      if (stage.script === 'scripts/update_tcgdex_data.ts') {
        if (personal.size) restore_personal_data(personal);
        if (reset) reset_generated_caches(root);
      }
    }
  } catch (err) {
    restore_personal_data(personal);
    const code = err instanceof Stage_Error ? err.code : 1;
    log(
      code === 130
        ? 'Update interrupted.'
        : `Update stopped because a stage failed with exit code ${code}.`,
      true,
    );
    if (!(err instanceof Stage_Error)) log(String(err), true);
    return code;
  }
  log(`Data update completed successfully in ${duration((performance.now() - started) / 1000)}.`);
  return 0;
}
export function parse_update_options(argv = process.argv.slice(2)): {
  reset: boolean;
  prices: boolean;
  help: boolean;
} {
  const args = cli({ reset: { type: 'boolean' }, prices: { type: 'boolean' } }, argv);
  if (args.reset && args.prices) throw new Error('--reset and --prices cannot be combined.');
  return { reset: !!args.reset, prices: !!args.prices, help: !!args.help };
}
export async function main(): Promise<number> {
  let args;
  try {
    args = parse_update_options();
  } catch (err) {
    log(err instanceof Error ? err.message : String(err), true);
    return 2;
  }
  if (args.help) {
    console.log(
      'Run the complete Card Manager data update pipeline.\nUsage: npm run update -- [--reset | --prices]',
    );
    return 0;
  }
  return pipeline(args.prices, args.reset);
}

if (is_main(import.meta.url))
  void entry(async () => {
    const reports = join(project_root, 'reports');
    mkdirSync(reports, { recursive: true });
    writeFileSync(join(reports, 'images.jsonl'), '');
    return capture_run_log(join(reports, 'update.log'), async () => {
      log('Run log: reports/update.log');
      return main();
    });
  });
