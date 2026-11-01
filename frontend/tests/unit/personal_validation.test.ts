// import utils
import {
  parse_collection_data,
  parse_binders_data,
  parse_manual_image_data,
} from '../../src/services/personal_validation';
import { expect, test } from 'vitest';

test('accepts legacy collections without discarding saved fields or changing input', () => {
  const legacy = {
    version: 1,
    folders: [{ id: 'main', name: 'Old collection', extra: 'preserve' }],
    entries: [],
    extra: { preserve: true },
  };
  expect(parse_collection_data(legacy)).toEqual({ ...legacy, version: 2, manual_cards: [] });
  expect(legacy.version).toBe(1);
  expect(legacy).not.toHaveProperty('manual_cards');
});

test('rejects malformed nested personal records before state or storage replacement', () => {
  expect(() => parse_collection_data({ folders: [], entries: [{ id: 'incomplete' }] })).toThrow();
  expect(() =>
    parse_binders_data({
      version: 1,
      binders: [{ folder_id: 'x', page_count: -1, layout: '2x2', slots: [] }],
    }),
  ).toThrow();
  expect(() => parse_manual_image_data({ entries: [{ url: 'https://example.com' }] })).toThrow();
});

test('preserves legacy binder fields for the existing load normalization', () => {
  const legacy = {
    binders: [{ folder_id: 'old', page_count: 1, layout: '2x2', slots: [], locked: true }],
  };
  expect(parse_binders_data(legacy)).toEqual({ ...legacy, version: 1 });
});

test('normalizes missing legacy manual-card fields without changing the original record', () => {
  const card = { id: 'legacy-manual', name: 'Legacy card', extra: 'keep', notes: null };
  const input = { version: 2, folders: [], entries: [], manual_cards: [card] };
  const parsed = parse_collection_data(input).manual_cards[0];
  expect(parsed.types.join(', ')).toBe('');
  expect(parsed.set_name.trim()).toBe('');
  expect(parsed.notes).toBe('');
  expect(parsed).toMatchObject({
    extra: 'keep',
    hp: null,
    estimated_value: null,
    release_date: null,
  });
  expect(card).not.toHaveProperty('types');
  expect(card.notes).toBeNull();
});

test('rejects invalid manual-card values instead of inventing replacements', () => {
  for (const fields of [{ types: 'fire' }, { types: [1] }, { hp: '100' }, { notes: 7 }]) {
    expect(() =>
      parse_collection_data({
        version: 2,
        folders: [],
        entries: [],
        manual_cards: [{ id: 'bad', name: 'Bad card', ...fields }],
      }),
    ).toThrow('Invalid collection data');
  }
});
