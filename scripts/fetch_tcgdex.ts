// import utils
import { project_root, run_command, is_main, entry, cli } from './runtime';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { log } from './update_logging';

export function fetch_tcgdex(root = project_root): number {
  const checkout = join(root, 'tcgdex_data/cards-database');
  if (existsSync(checkout) && !existsSync(join(checkout, '.git'))) {
    log(`Refusing to replace non-Git path: ${checkout}`, true);
    return 1;
  }
  if (!existsSync(checkout)) {
    mkdirSync(dirname(checkout), { recursive: true });
    log(`Cloning TCGdex into ${checkout}`);
    run_command(
      [
        'git',
        'clone',
        '--depth',
        '1',
        '--filter=blob:none',
        '--sparse',
        'https://github.com/tcgdex/cards-database.git',
        checkout,
      ],
      root,
    );
  } else {
    log(`Updating existing TCGdex checkout in ${checkout}`);
    run_command(['git', 'pull', '--ff-only'], checkout);
  }
  run_command(['git', 'sparse-checkout', 'set', 'data', 'data-asia'], checkout);
  log(`TCGdex checkout ready at commit ${run_command(['git', 'rev-parse', 'HEAD'], checkout)}`);
  return 0;
}
if (is_main(import.meta.url))
  void entry(() => {
    const args = cli({});
    if (args.help) {
      console.log('Create or update the persistent sparse TCGdex source checkout.');
      return 0;
    }
    return fetch_tcgdex();
  });
