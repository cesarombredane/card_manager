import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  project_root,
  data_root,
  files,
  write_json,
  compare,
  cli,
  run_command,
  is_main,
  entry,
} from './runtime';
import { source_folders, language_names } from './catalog_constants';
import {
  parse_typescript_object,
  slugify,
  normalize_localized_text,
  normalize_card,
  restrict_card_languages,
  release_date_value,
  first_localized_value,
  build_pokemon_catalog,
} from './catalog_normalization';
import {
  validate_generated_sets,
  preserve_image_references,
  preserve_price_data,
  catalog_inventory,
  inventory_changes,
  merge_append_only,
  personal_data_files,
} from './catalog_storage';
import { download_price_guide, index_price_guide } from './cardmarket_prices';
import { generate_coverage } from './report_coverage';
import { duration, log } from './update_logging';
import type { Json_Object } from './runtime';
import type { Mapping_Diagnostics, Pokemon_Aliases } from './catalog_normalization';
import type { Series, Card, Set as Card_Set } from '../frontend/src/models/catalog';
export type Catalog_Options = {
  overwrite: boolean;
  preserve_images: boolean;
  preserve_prices: boolean;
};
export function convert_source_folder(
  source: string,
  name: string,
  output: string,
  aliases: Pokemon_Aliases,
  updated_at: string,
  prices: Map<number, Json_Object>,
  diagnostics: Mapping_Diagnostics,
): [Series[], string[]] {
  const config = source_folders[name],
    series_rows: Series[] = [],
    languages_seen = new Set<string>();
  for (const path of files(join(source, name), '.ts')) {
    const series_name = basename(path, '.ts'),
      folder = join(source, name, series_name);
    if (series_name === 'Pokémon TCG Pocket' || !existsSync(folder)) continue;
    const raw_series = parse_typescript_object(path),
      raw_id = String(raw_series.id || series_name),
      series_id = `${config.series_prefix}-${slugify(raw_id)}`;
    const sets: Card_Set[] = [];
    let earliest = '';
    for (const set_file of files(folder, '.ts')) {
      const set_name = basename(set_file, '.ts'),
        set_folder = join(folder, set_name);
      if (!existsSync(set_folder)) continue;
      const raw = parse_typescript_object(set_file),
        set_id = `${config.series_prefix}-${slugify(String(raw.id || set_name))}`;
      const names = normalize_localized_text(raw.name);
      if (!Object.values(names).some(Boolean)) continue;
      const languages = Object.keys(names).sort(compare);
      languages.forEach((language) => languages_seen.add(language));
      const cards: Card[] = files(set_folder, '.ts')
        .sort((a, b) => compare(basename(a, '.ts'), basename(b, '.ts')))
        .map((card_file) => {
          const card = normalize_card(
            card_file,
            set_id,
            languages,
            aliases,
            updated_at,
            prices,
            diagnostics,
          );
          restrict_card_languages(card, languages);
          return card;
        });
      const release = release_date_value(raw.releaseDate);
      if (release && (!earliest || compare(release, earliest) < 0)) earliest = release;
      sets.push({
        id: set_id,
        tcgdex_id: String(raw.id || set_name),
        tcgdex_series_id: raw_id,
        series_id,
        name: names,
        title_image_url: null,
        symbol_image_url: null,
        release_date: release,
        card_count: cards.reduce((sum, card) => sum + card.variants.length, 0),
        language_ids: languages,
      });
      write_json(join(output, series_id, `cards_${set_id}.json`), cards);
    }
    if (sets.length) {
      series_rows.push({
        id: series_id,
        region_id: config.region_id,
        name: first_localized_value(raw_series.name) || series_name,
        start_date: earliest,
      });
      write_json(join(output, series_id, 'sets.json'), sets);
    }
  }
  return [series_rows, [...languages_seen].sort(compare)];
}
export async function build_catalog(
  args: Catalog_Options,
  source: string,
  commit: string,
  output = data_root,
): Promise<number> {
  if (!existsSync(source)) {
    log(`Missing source folder: ${source}`, true);
    return 1;
  }
  const staging = `${output}.tmp`,
    discovered = `${output}.discovered`,
    backup = `${output}.previous`;
  // Never destroy a previous checkout left by an interrupted publication.
  if (!existsSync(output) && existsSync(backup)) renameSync(backup, output);
  for (const path of [staging, discovered]) rmSync(path, { recursive: true, force: true });
  mkdirSync(discovered, { recursive: true });
  let updated_at = '',
    prices = new Map<number, Json_Object>();
  if (args.preserve_prices) log('Skipping Cardmarket price guide and preserving existing prices');
  else {
    log('Loading Cardmarket price guide');
    try {
      [updated_at, prices] = index_price_guide(
        await download_price_guide(join(project_root, 'tcgdex_data/cardmarket-price-guide.json')),
      );
      log(`Loaded ${prices.size} products (${updated_at || 'unknown date'})`);
    } catch (err) {
      log(`Price guide unavailable; generating links without prices: ${err}`, true);
    }
  }
  log('[1/3] Converting supported physical-card data');
  const [pokemon, aliases] = build_pokemon_catalog(source),
    diagnostics: Mapping_Diagnostics = { counts: {}, ambiguous: [], unmapped: [] };
  const series: Series[] = [],
    all_languages = new Set<string>();
  for (const name of Object.keys(source_folders)) {
    const [rows, languages] = convert_source_folder(
      source,
      name,
      discovered,
      aliases,
      updated_at,
      prices,
      diagnostics,
    );
    series.push(...rows);
    languages.forEach((language) => all_languages.add(language));
  }
  write_json(join(discovered, 'regions.json'), [
    { id: 'INTL', name: 'International' },
    { id: 'ASIA', name: 'Asia' },
  ]);
  write_json(
    join(discovered, 'languages.json'),
    [...all_languages].sort(compare).map((id) => ({ id, name: language_names[id] || id })),
  );
  write_json(
    join(discovered, 'series.json'),
    series.sort(
      (a, b) =>
        compare(a.region_id, b.region_id) ||
        compare(a.start_date, b.start_date) ||
        compare(a.name, b.name),
    ),
  );
  write_json(join(discovered, 'pokemon.json'), pokemon);
  if (args.preserve_images) {
    const counts = preserve_image_references(output, discovered);
    log(`Preserved image references for ${counts.sets} sets and ${counts.variants} card variants`);
  }
  if (args.preserve_prices)
    log(`Preserved Cardmarket data for ${preserve_price_data(output, discovered)} card variants`);
  validate_generated_sets(discovered);
  log('Pokemon mapping summary');
  const mapped = Object.entries(diagnostics.counts)
    .filter(([status]) => !['ambiguous', 'unmapped'].includes(status))
    .reduce((sum, [, count]) => sum + count, 0);
  log(
    `Mapped ${mapped.toLocaleString('en-US')} · ambiguous ${diagnostics.counts.ambiguous || 0} · unmapped ${diagnostics.counts.unmapped || 0}`,
  );
  for (const status of ['ambiguous', 'unmapped'] as const)
    if (diagnostics[status].length) {
      log(`Sample ${status} cards:`);
      for (const row of diagnostics[status].slice(0, 3))
        log(`${row.id}: ${row.name.en || Object.values(row.name)[0] || '(unnamed)'}`);
    }
  const old = catalog_inventory(output),
    current = catalog_inventory(discovered),
    changes = inventory_changes(old, current);
  const losses = Object.keys(old.cards).filter(
    (id) =>
      current.cards[id] && old.cards[id].pokemon?.length && !current.cards[id].pokemon?.length,
  );
  if (losses.length)
    log(
      `Warning: ${losses.length} previously mapped Pokemon cards became unmapped (examples: ${losses.sort(compare).slice(0, 10).join(', ')}).`,
      true,
    );
  const unmapped = (cards: typeof old.cards) =>
    Object.values(cards).filter((card) => card.category === 'pokemon' && !card.pokemon?.length)
      .length;
  if (unmapped(current.cards) > unmapped(old.cards))
    log(
      `Warning: unmapped Pokemon cards increased from ${unmapped(old.cards)} to ${unmapped(current.cards)}.`,
      true,
    );
  log(
    'Data summary\n  Type       Pulled    Added    Updated    Removed\n  --------  -------  -------  ---------  ---------',
  );
  for (const kind of ['series', 'sets', 'cards', 'pokemon']) {
    const row = changes[kind];
    log(
      `${(kind[0].toUpperCase() + kind.slice(1)).padEnd(8)}  ${String(row.pulled).padStart(7)}  ${String(row.added).padStart(7)}  ${String(args.overwrite ? row.updated : 0).padStart(9)}  ${String(args.overwrite ? row.removed : 0).padStart(9)}`,
    );
  }
  log(`[2/3] Preparing ${args.overwrite ? 'overwrite' : 'append-only'} catalog`);
  if (args.overwrite) cpSync(discovered, staging, { recursive: true });
  else merge_append_only(output, discovered, staging);
  // Store personal bytes in staging before publication, including standalone --overwrite.
  for (const name of personal_data_files)
    if (existsSync(join(output, name))) cpSync(join(output, name), join(staging, name));
  validate_generated_sets(staging);
  log('[3/3] Generating coverage and publishing');
  const coverage = generate_coverage(staging);
  rmSync(backup, { recursive: true, force: true });
  if (existsSync(output)) renameSync(output, backup);
  try {
    renameSync(staging, output);
  } catch (err) {
    if (existsSync(backup) && !existsSync(output)) renameSync(backup, output);
    throw err;
  }
  rmSync(backup, { recursive: true, force: true });
  rmSync(discovered, { recursive: true, force: true });
  log(
    `Update complete\n  Mode: ${args.overwrite ? 'overwrite' : 'append-only'}\n  TCGdex commit: ${commit}\n  Series: ${coverage.totals.sets ? Object.keys(coverage.series).length : 0}\n  Sets: ${coverage.totals.sets}\n  Cards: ${coverage.totals.cards}\n  Variants: ${coverage.totals.variants}\n  Image coverage: ${coverage.totals.image_slot_coverage_percent.toFixed(2)}%\n  Published to: ${output}`,
  );
  return 0;
}
export async function main(): Promise<number> {
  const args = cli({
    overwrite: { type: 'boolean' },
    'preserve-images': { type: 'boolean' },
    'preserve-prices': { type: 'boolean' },
  });
  if (args.help) {
    console.log(
      'Build catalog: tsx scripts/update_tcgdex_data.ts [--overwrite] [--preserve-images] [--preserve-prices]',
    );
    return 0;
  }
  const source = join(project_root, 'tcgdex_data/cards-database');
  if (!existsSync(join(source, '.git'))) {
    log(`Missing TCGdex checkout: ${source}\nRun scripts/fetch_tcgdex.ts first.`, true);
    return 1;
  }
  const started = performance.now();
  const result = await build_catalog(
    {
      overwrite: !!args.overwrite,
      preserve_images: !!args['preserve-images'],
      preserve_prices: !!args['preserve-prices'],
    },
    source,
    run_command(['git', 'rev-parse', 'HEAD'], source),
  );
  log(`Total duration: ${duration((performance.now() - started) / 1000)}`);
  return result;
}
if (is_main(import.meta.url)) void entry(main);
