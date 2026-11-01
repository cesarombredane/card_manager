import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  parse_update_options,
  pipeline,
  reset_generated_caches,
  run_stage,
  Stage_Error,
  stages,
} from '../update_data';
import { capture_run_log } from '../scripts/update_logging';
const temporary: string[] = [];
function directory(): string {
  const path = mkdtempSync(join(tmpdir(), 'card-pipeline-test-'));
  temporary.push(path);
  return path;
}
afterEach(() => {
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
});
describe('pipeline contract', () => {
  it('rejects conflicting, unknown and positional arguments without running stages', () => {
    expect(parse_update_options([])).toEqual({ reset: false, prices: false, help: false });
    expect(parse_update_options(['--prices']).prices).toBe(true);
    expect(() => parse_update_options(['--reset', '--prices'])).toThrow('cannot be combined');
    expect(() => parse_update_options(['--unknown'])).toThrow();
    expect(() => parse_update_options(['unexpected'])).toThrow();
  });

  it('preserves stage order and validates every mode', () => {
    expect(stages(false, false).map((stage) => stage.script || 'typecheck')).toEqual([
      'scripts/fetch_tcgdex.ts',
      'scripts/update_tcgdex_data.ts',
      'scripts/update_cardmarket_prices.ts',
      'scripts/update_tcgdex_images.ts',
      'scripts/report_coverage.ts',
      'typecheck',
    ]);
    expect(stages(true, false).map((stage) => stage.script || 'typecheck')).toEqual([
      'scripts/update_cardmarket_prices.ts',
      'typecheck',
    ]);
    expect(stages(false, true)[1].args).toEqual(['--overwrite']);
  });
  it('overwrites the transcript, captures child stdout/stderr and propagates failure codes', async () => {
    const path = join(directory(), 'update.log');
    writeFileSync(path, 'old run');
    await capture_run_log(path, async () => {
      await run_stage('child', [
        process.execPath,
        '-e',
        "console.log('child output'); console.error('child error')",
      ]);
      await expect(
        run_stage('failure', [process.execPath, '-e', 'process.exit(7)']),
      ).rejects.toMatchObject({ code: 7 });
    });
    const text = readFileSync(path, 'utf8');
    expect(text).not.toContain('old run');
    expect(text).toContain('child output');
    expect(text).toContain('child error');
  });
  it.each([7, 130])(
    'restores personal bytes and stops after failure/interruption code %i',
    async (code) => {
      const root = directory(),
        path = join(root, 'frontend/data/collection.json');
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, 'precious');
      let calls = 0;
      const result = await pipeline(false, true, root, async () => {
        calls++;
        writeFileSync(path, 'broken');
        throw new Stage_Error(code);
      });
      expect(result).toBe(code);
      expect(calls).toBe(1);
      expect(readFileSync(path, 'utf8')).toBe('precious');
    },
  );
  it('resets generated caches without touching manual images or personal files', () => {
    const root = directory();
    for (const name of [
      'frontend/public/images/cards/a.webp',
      'frontend/public/images/sets/a.webp',
      'frontend/public/images/manual/precious.webp',
      'frontend/data/collection.json',
      'tcgdex_data/cardmarket-price-guide.json',
    ]) {
      const path = join(root, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, 'keep');
    }
    reset_generated_caches(root);
    expect(existsSync(join(root, 'frontend/public/images/cards'))).toBe(false);
    expect(existsSync(join(root, 'tcgdex_data/cardmarket-price-guide.json'))).toBe(false);
    expect(readFileSync(join(root, 'frontend/public/images/manual/precious.webp'), 'utf8')).toBe(
      'keep',
    );
    expect(readFileSync(join(root, 'frontend/data/collection.json'), 'utf8')).toBe('keep');
  });
});
