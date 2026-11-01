// import utils
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { parse_typescript_object } from '../scripts/catalog_normalization';
import { generate_coverage } from '../scripts/report_coverage';
import { build_catalog } from '../scripts/update_tcgdex_data';
import { read_json, write_json } from '../scripts/runtime';
import { afterEach, describe, expect, it } from 'vitest';
import { join, resolve } from 'node:path';
import {
  append_unique,
  merge_append_only,
  preserve_image_references,
  preserve_price_data,
  validate_generated_sets,
} from '../scripts/catalog_storage';
import { tmpdir } from 'node:os';

// import types
import type { Card } from '../frontend/src/models/catalog';

const temporary: string[] = [];
const fixture = resolve('tests/fixtures/source');
const expected = read_json<Record<string, unknown>>(
  resolve('tests/fixtures/expected_catalog.json'),
);
function directory(): string {
  const path = mkdtempSync(join(tmpdir(), 'card-catalog-test-'));
  temporary.push(path);
  return path;
}
afterEach(() => {
  temporary.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
});
const options = { overwrite: true, preserve_prices: true, preserve_images: false };
describe('Python compatibility fixtures', () => {
  it('matches every normalized record and coverage value from the original Python generator', async () => {
    const output = join(directory(), 'data');
    expect(await build_catalog(options, fixture, 'fixture', output)).toBe(0);
    for (const [name, baseline] of Object.entries(expected)) {
      const result = read_json<Record<string, unknown>>(join(output, name));
      if (name === 'coverage.json') delete result.generated_at;
      expect(result, name).toEqual(baseline);
    }
  });
  it('only interprets literal data and rejects executable upstream expressions', () => {
    const path = join(directory(), 'unsafe.ts');
    writeFileSync(path, 'const card = { name: process.exit(42) }; ');
    expect(() => parse_typescript_object(path)).toThrow('Unsupported upstream expression');
  });
  it('preserves personal bytes with overwrite and retains existing catalog rows in append mode', async () => {
    const output = join(directory(), 'data');
    await build_catalog(options, fixture, 'fixture', output);
    const personal = Buffer.from('{"version":2,"entries":[{"id":"precious"}]}\n');
    for (const name of ['collection.json', 'binders.json', 'manual-images.json'])
      writeFileSync(join(output, name), personal);
    await build_catalog(options, fixture, 'fixture', output);
    for (const name of ['collection.json', 'binders.json', 'manual-images.json'])
      expect(readFileSync(join(output, name))).toEqual(personal);
    const path = join(output, 'intl-sample/cards_intl-test.json'),
      cards = read_json<Card[]>(path);
    cards[0].name.en = 'Local metadata';
    write_json(path, cards);
    const original = readFileSync(path);
    await build_catalog({ ...options, overwrite: false }, fixture, 'fixture', output);
    expect(readFileSync(path)).toEqual(original);
    expect(readFileSync(join(output, 'collection.json'))).toEqual(personal);
  });
  it('keeps the published catalog intact when conversion fails', async () => {
    const root = directory(),
      source = join(root, 'source'),
      output = join(root, 'data');
    cpSync(fixture, source, { recursive: true });
    await build_catalog(options, source, 'fixture', output);
    const before = readFileSync(join(output, 'pokemon.json'));
    writeFileSync(
      join(source, 'data/Sample/TEST/001.ts'),
      'const bad = { execute: do_bad_things() };',
    );
    await expect(build_catalog(options, source, 'fixture', output)).rejects.toThrow();
    expect(readFileSync(join(output, 'pokemon.json'))).toEqual(before);
  });
  it('recovers the previous catalog after interrupted publication', async () => {
    const root = directory(),
      output = join(root, 'data');
    await build_catalog(options, fixture, 'fixture', `${output}.previous`);
    writeFileSync(join(`${output}.previous`, 'collection.json'), 'saved');
    await build_catalog(options, fixture, 'fixture', output);
    expect(readFileSync(join(output, 'collection.json'), 'utf8')).toBe('saved');
    expect(existsSync(`${output}.previous`)).toBe(false);
  });
});
describe('catalog storage contracts', () => {
  it('appends records without modifying known IDs, including retained rows removed upstream', () => {
    expect(
      append_unique(
        [
          { id: 'a', value: 'old' },
          { id: 'retained', value: 'keep' },
        ],
        [
          { id: 'a', value: 'new' },
          { id: 'b', value: 'added' },
        ],
      ),
    ).toEqual([
      [
        { id: 'a', value: 'old' },
        { id: 'retained', value: 'keep' },
        { id: 'b', value: 'added' },
      ],
      1,
    ]);
  });
  it('preserves cached references and prices by card and variant IDs', async () => {
    const root = directory(),
      old = join(root, 'old'),
      fresh = join(root, 'fresh');
    await build_catalog(options, fixture, 'fixture', old);
    cpSync(old, fresh, { recursive: true });
    const path = join(old, 'intl-sample/cards_intl-test.json'),
      cards = read_json<Card[]>(path);
    cards[0].variants[0].images.en = '/images/old.webp';
    cards[0].variants[0].cardmarket!.average = 99;
    write_json(path, cards);
    expect(preserve_image_references(old, fresh).variants).toBeGreaterThan(0);
    expect(preserve_price_data(old, fresh)).toBeGreaterThan(0);
    const result = read_json<Card[]>(join(fresh, 'intl-sample/cards_intl-test.json'));
    expect(result[0].variants[0]).toEqual(cards[0].variants[0]);
  });
  it('rejects invalid localized set contracts before publication', () => {
    const root = directory();
    write_json(join(root, 's/sets.json'), [
      { id: 'broken', tcgdex_id: 'x', name: { en: 'Name' }, language_ids: ['fr'] },
    ]);
    expect(() => validate_generated_sets(root)).toThrow('name languages must match');
  });
  it('copies unknown local files and counts additions while merging', async () => {
    const root = directory(),
      source = join(root, 'source'),
      old = join(root, 'old'),
      merged = join(root, 'merged');
    await build_catalog(options, fixture, 'fixture', source);
    write_json(join(old, 'custom.json'), { keep: true });
    const counts = merge_append_only(old, source, merged);
    expect(counts.cards).toBe(4);
    expect(read_json(join(merged, 'custom.json'))).toEqual({ keep: true });
  });
  it('reports actual image slots, missing metadata, and set assets', () => {
    const root = directory();
    write_json(join(root, 'series.json'), [{ id: 's', name: 'Series', region_id: 'INTL' }]);
    write_json(join(root, 's/sets.json'), [
      { id: 'x', name: { en: 'Set' }, language_ids: ['en', 'fr'] },
    ]);
    write_json(join(root, 's/cards_x.json'), [
      { id: 'x-1', name: {}, variants: [{ id: 'normal', images: { en: '/a.webp', fr: '' } }] },
    ]);
    const result = generate_coverage(root);
    expect(result.totals).toMatchObject({
      cards: 1,
      variants: 1,
      image_slots: 2,
      filled_image_slots: 1,
      image_slot_coverage_percent: 50,
    });
    expect(result.missing_metadata.name).toEqual(['x-1']);
    expect(result.sets[0].missing_images.fr).toEqual(['x-1:normal']);
  });
});
