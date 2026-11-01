// import utils
import { expect, test } from 'vitest';
import {
  parse_collection_data,
  parse_binders_data,
  parse_manual_image_data,
} from '../../src/services/personal_validation';

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
