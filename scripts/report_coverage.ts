// import utils
import { dirname, basename, join, resolve } from 'node:path';
import { log } from './update_logging';
import {
  read_json,
  write_json,
  set_paths,
  compare,
  cli,
  project_root,
  is_main,
  entry,
} from './runtime';

// import types
import type {
  Card,
  Set as Card_Set,
  Series,
  Coverage_Counts,
  Coverage_Report,
  Set_Coverage,
} from '../frontend/src/models/catalog';

const metadata_fields = [
  'name',
  'category',
  'rarity',
  'illustrator',
  'regulation_mark',
  'variants',
] as const;
// Python round uses ties-to-even; preserve percentage values in saved reports.
export function percentage(filled: number, total: number): number {
  if (!total) return 100;
  const scaled = (filled * 10000) / total,
    floor = Math.floor(scaled);
  return (scaled - floor === 0.5 ? floor + (floor % 2) : Math.round(scaled)) / 100;
}
function counts(slots = 0, filled = 0): Coverage_Counts {
  return { slots, filled, missing: slots - filled, percent: percentage(filled, slots) };
}
export function generate_coverage(
  root: string,
  output = join(root, 'coverage.json'),
): Coverage_Report {
  const metadata = new Map(
    read_json<Series[]>(join(root, 'series.json'), []).map((row) => [row.id, row]),
  );
  const totals: Record<string, number> = {};
  const increment = (key: string, value = 1) => {
    totals[key] = (totals[key] || 0) + value;
  };
  const language_counts: Record<string, Coverage_Counts> = {};
  const series_counts: Record<string, { sets: number; cards: number; cards_with_image: number }> =
    {};
  const missing_metadata: Record<string, string[]> = Object.fromEntries(
    metadata_fields.map((field) => [field, []]),
  );
  const missing_set_assets = { logo: [] as string[], symbol: [] as string[] },
    reports: Set_Coverage[] = [];
  for (const path of set_paths(root)) {
    const series_id = basename(dirname(path)),
      series = metadata.get(series_id);
    for (const row of read_json<Card_Set[]>(path, [])) {
      const current = (series_counts[series_id] ||= { sets: 0, cards: 0, cards_with_image: 0 });
      current.sets++;
      increment('sets');
      const has_logo = !!row.title_image_url,
        has_symbol = !!row.symbol_image_url;
      increment('set_logos', Number(has_logo));
      increment('set_symbols', Number(has_symbol));
      if (!has_logo) missing_set_assets.logo.push(String(row.id));
      if (!has_symbol) missing_set_assets.symbol.push(String(row.id));
      const cards = read_json<Card[]>(join(dirname(path), `cards_${row.id}.json`), []);
      let variants = 0,
        cards_with_image = 0;
      const set_languages: Record<string, Coverage_Counts> = {},
        missing_images: Record<string, string[]> = {},
        missing_card_ids: string[] = [];
      for (const card of cards) {
        increment('cards');
        current.cards++;
        for (const field of metadata_fields) {
          const value = card[field];
          if (
            value == null ||
            value === '' ||
            (typeof value === 'object' && !Object.keys(value).length)
          )
            missing_metadata[field].push(String(card.id));
        }
        let has_image = false;
        for (const variant of card.variants || []) {
          increment('variants');
          variants++;
          for (const language of row.language_ids || []) {
            const url = variant.images?.[language] || '';
            increment('image_slots');
            const global = (language_counts[language] ||= counts()),
              local = (set_languages[language] ||= counts());
            global.slots++;
            local.slots++;
            if (url) {
              increment('filled_image_slots');
              global.filled++;
              local.filled++;
              has_image = true;
            } else (missing_images[language] ||= []).push(`${card.id}:${variant.id ?? 'normal'}`);
          }
        }
        if (has_image) {
          increment('cards_with_image');
          current.cards_with_image++;
          cards_with_image++;
        } else missing_card_ids.push(String(card.id));
      }
      reports.push({
        id: String(row.id),
        name: row.name?.en || Object.values(row.name || {})[0] || String(row.id),
        series_id,
        series_name: series?.name ?? series_id,
        region_id: series?.region_id ?? 'unknown',
        release_date: row.release_date ?? '',
        languages: [...(row.language_ids || [])],
        has_logo,
        has_symbol,
        cards: cards.length,
        variants,
        cards_with_image,
        cards_without_image: cards.length - cards_with_image,
        image_coverage_percent: percentage(cards_with_image, cards.length),
        language_coverage: Object.fromEntries(
          Object.keys(set_languages)
            .sort(compare)
            .map((key) => [key, counts(set_languages[key].slots, set_languages[key].filled)]),
        ),
        missing_card_ids,
        missing_images: Object.fromEntries(
          Object.keys(missing_images)
            .sort(compare)
            .map((key) => [key, missing_images[key]]),
        ),
        sources: {},
      });
    }
  }
  const total = (key: string) => totals[key] || 0;
  const report: Coverage_Report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    totals: {
      ...totals,
      missing_set_logos: total('sets') - total('set_logos'),
      missing_set_symbols: total('sets') - total('set_symbols'),
      cards_without_image: total('cards') - total('cards_with_image'),
      missing_image_slots: total('image_slots') - total('filled_image_slots'),
      card_image_coverage_percent: percentage(total('cards_with_image'), total('cards')),
      image_slot_coverage_percent: percentage(total('filled_image_slots'), total('image_slots')),
    },
    sources: {
      definitions: { tcgdex: { name: 'TCGdex' } },
      matched_sets: total('sets'),
      matched_cards: total('cards'),
      metadata_fields_filled: 0,
    },
    languages: Object.fromEntries(
      Object.keys(language_counts)
        .sort(compare)
        .map((key) => [key, counts(language_counts[key].slots, language_counts[key].filled)]),
    ),
    missing_metadata: Object.fromEntries(
      Object.entries(missing_metadata).filter(([, ids]) => ids.length),
    ),
    missing_set_assets,
    series: Object.fromEntries(
      Object.keys(series_counts)
        .sort(compare)
        .map((id) => {
          const c = series_counts[id];
          return [
            id,
            {
              name: metadata.get(id)?.name ?? id,
              region_id: metadata.get(id)?.region_id ?? 'unknown',
              ...c,
              cards_without_image: c.cards - c.cards_with_image,
              percent: percentage(c.cards_with_image, c.cards),
            },
          ];
        }),
    ),
    sets: reports.sort(
      (a, b) =>
        compare(a.region_id, b.region_id) ||
        compare(a.release_date, b.release_date) ||
        compare(a.name, b.name),
    ),
  };
  write_json(output, report);
  return report;
}
export function main(): number {
  const args = cli({
    data: { type: 'string', default: 'frontend/data' },
    output: { type: 'string' },
  });
  if (args.help) {
    console.log('Generate coverage: tsx scripts/report_coverage.ts [--data PATH] [--output PATH]');
    return 0;
  }
  const root = resolve(project_root, String(args.data)),
    output = args.output ? resolve(project_root, String(args.output)) : join(root, 'coverage.json');
  const report = generate_coverage(root, output);
  log(
    `Coverage generated\n  Sets: ${report.totals.sets}\n  Cards: ${report.totals.cards}\n  Variants: ${report.totals.variants}\n  Card coverage: ${report.totals.card_image_coverage_percent.toFixed(2)}%\n  Image coverage: ${report.totals.image_slot_coverage_percent.toFixed(2)}%\n  Output: ${output}`,
  );
  return 0;
}
if (is_main(import.meta.url)) void entry(main);
