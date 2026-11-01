import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { data_root, project_root, cli, is_main, entry } from './runtime';
import { sync_assets, image_workers, request_timeout } from './image_assets';
import { generate_coverage } from './report_coverage';
import { duration, log } from './update_logging';
export async function main(): Promise<number> {
  const args = cli({ 'set-only': { type: 'boolean' } });
  if (args.help) {
    console.log('Update cached images: tsx scripts/update_tcgdex_images.ts [--set-only]');
    return 0;
  }
  if (!existsSync(join(data_root, 'series.json'))) {
    log(`Missing generated card data: ${data_root}`);
    return 1;
  }
  const started = performance.now();
  const result = await sync_assets(
    data_root,
    join(project_root, 'frontend/public/images'),
    image_workers,
    request_timeout,
    !!args['set-only'],
  );
  const coverage = generate_coverage(data_root);
  log(
    result.failures ? 'Image update finished with errors' : 'Image update complete',
    !!result.failures,
  );
  log(
    `Checked ${result.candidates.toLocaleString('en-US')} assets · downloaded ${result.downloaded.toLocaleString('en-US')} · unavailable ${result.unavailable.toLocaleString('en-US')} · failed ${result.failures.toLocaleString('en-US')}`,
  );
  log(
    `Filled ${result.filled_references.toLocaleString('en-US')} references · image coverage ${coverage.totals.image_slot_coverage_percent.toFixed(2)}% · elapsed ${duration((performance.now() - started) / 1000)}`,
  );
  return result.failures ? 1 : 0;
}
if (is_main(import.meta.url)) void entry(main);
