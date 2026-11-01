import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { basename, sep } from 'node:path';
import { object, files, compare } from './runtime';
import {
  energy_map,
  variant_map,
  language_code_map,
  source_folders,
  form_markers,
  regional_prefixes,
  region_exclusive_species,
  pokemon_overrides,
  language_names,
} from './catalog_constants';
import { normalized_price, product_url } from './cardmarket_prices';
import type { Json, Json_Object } from './runtime';
import type { Card, CardVariant, LocalizedText, Pokemon } from '../frontend/src/models/catalog';

// Interpret data literals only. Upstream TypeScript is never imported or executed.
function literal(node: ts.Expression): Json {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isObjectLiteralExpression(node)) {
    const result: Json_Object = {};
    for (const property of node.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        !property.name ||
        ts.isComputedPropertyName(property.name)
      )
        throw new Error('Unsupported upstream object property');
      result[property.name.getText().replace(/^['"]|['"]$/g, '')] = literal(property.initializer);
    }
    return result;
  }
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((element) => literal(element as ts.Expression));
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken)
    return -Number(literal(node.operand));
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = literal(node.left),
      right = literal(node.right);
    if (typeof left === 'string' && typeof right === 'string') return left + right;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(node)) return node.text;
  throw new Error(`Unsupported upstream expression: ${node.getText().slice(0, 100)}`);
}
export function parse_typescript_object(path: string): Json_Object {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
        const result = literal(declaration.initializer);
        if (object(result)) return result;
      }
    }
  }
  throw new Error(`No object literal found in ${path}`);
}
export function normalize_language_code(value: string): string {
  return language_code_map[value] || value;
}
export function normalize_localized_text(value: Json | undefined): LocalizedText {
  if (typeof value === 'string') return { en: value };
  return object(value)
    ? Object.fromEntries(
        Object.entries(value)
          .filter(([, text]) => text === null || typeof text === 'string')
          .map(([key, text]) => [normalize_language_code(key), text as string | null]),
      )
    : {};
}
export function first_localized_value(value: Json | undefined, language = 'en'): string | null {
  const localized = normalize_localized_text(value);
  return localized[language] || Object.values(localized).find(Boolean) || null;
}
export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replaceAll('&', 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}
export function normalize_enum(value: Json | undefined): string {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}
export function normalize_energy(value: Json | undefined): string {
  const normalized = normalize_enum(value);
  return energy_map[normalized] || normalized;
}
export function normalize_pokemon_name(value: string): string {
  let normalized = value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:Radiant|Shining)\s+/i, '')
    .replace(/(?:VMAX|VSTAR|GX|EX|V)$/i, '')
    .trim();
  const suffix = /(?:\s+|-)(?:ex|gx|v|vmax|vstar|break|lv\.?\s*x|star|δ)$/i;
  while (suffix.test(normalized)) normalized = normalized.replace(suffix, '').trim();
  return normalized;
}
function casefold(value: string): string {
  return value.toLowerCase().replaceAll('ß', 'ss').replaceAll('ς', 'σ');
}
export function pokemon_name_candidates(value: string): string[] {
  const normalized = normalize_pokemon_name(value);
  const undecorated = normalized
    .replace(/^(?:Radiant|Shining)\s+/i, '')
    .trim()
    .replace(/^(?:かがやく|光輝|闪耀|閃耀)\s*/, '')
    .trim();
  let unowned = undecorated;
  for (const pattern of [/^.+?[’']s\s+/i, /^.+?の\s*/, /^.+?的\s*/, /^.+?ของ\s*/]) {
    const candidate = undecorated.replace(pattern, '').trim();
    if (candidate !== undecorated) {
      unowned = candidate;
      break;
    }
  }
  return [normalized, undecorated, unowned];
}
export function pokemon_form_key(name: string): string {
  if (/^(m |mega )/i.test(name)) return `mega-${slugify(name.replace(/^(?:m|mega)\s+/i, ''))}`;
  for (const prefix of regional_prefixes)
    if (name.toLowerCase().startsWith(prefix))
      return `${prefix.trim()}-${slugify(name.slice(prefix.length))}`;
  return 'base';
}
export function localized_form_type(names: LocalizedText): string {
  const key = names.en ? pokemon_form_key(names.en) : 'base';
  if (key !== 'base') return key.split('-')[0];
  for (const [form, markers] of Object.entries(form_markers))
    if (
      markers.some((marker) =>
        Object.values(names).some((name) => name && casefold(name).includes(casefold(marker))),
      )
    )
      return form;
  return 'base';
}
export function pokemon_entry_id(id: number, form: string): string {
  return String(id).padStart(4, '0') + (form === 'base' ? '' : `-${form}`);
}
export type Pokemon_Aliases = { dex: Map<string, string>; names: Map<string, Set<string>> };
function alias_key(...parts: (number | string)[]): string {
  return JSON.stringify(parts);
}
function dex_ids(raw: Json_Object): number[] {
  const ids = raw.dexId || [];
  if (typeof ids === 'number' && Number.isInteger(ids)) return [ids];
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'number' || typeof id === 'string'))
    throw new Error('Invalid dexId');
  return ids.map((value) => Math.trunc(Number(value)));
}
export function build_pokemon_catalog(root: string): [Pokemon[], Pokemon_Aliases] {
  const parsed: { ids: number[]; names: Record<string, string> }[] = [];
  for (const folder of Object.keys(source_folders))
    for (const path of files(`${root}/${folder}`, '.ts', true)) {
      if (
        path.split(sep).includes('Pokémon TCG Pocket') ||
        path.slice(`${root}/${folder}/`.length).split(sep).length < 2
      )
        continue;
      let raw: Json_Object;
      try {
        raw = parse_typescript_object(path);
      } catch {
        continue;
      }
      if (normalize_enum(raw.category) !== 'pokemon') continue;
      const ids = dex_ids(raw),
        names = Object.fromEntries(
          Object.entries(normalize_localized_text(raw.name))
            .filter((pair): pair is [string, string] => !!pair[1])
            .map(([key, name]) => [key, normalize_pokemon_name(name)]),
        );
      if (ids.length && Object.keys(names).length) parsed.push({ ids, names });
    }
  const known = new Map<string, Set<string>>();
  for (const { ids, names } of parsed) {
    const form = names.en ? pokemon_form_key(names.en) : 'base';
    if (form === 'base') continue;
    for (const id of ids) {
      const key = alias_key(id, form.split('-')[0]);
      if (!known.has(key)) known.set(key, new Set());
      known.get(key)!.add(form);
    }
  }
  const groups = new Map<string, { id: number; form: string; names: Map<string, Set<string>> }>();
  for (const { ids, names } of parsed)
    for (const id of ids) {
      const form_type = localized_form_type(names);
      let form = names.en ? pokemon_form_key(names.en) : 'base';
      if (!names.en && form_type !== 'base') {
        const matching = known.get(alias_key(id, form_type));
        if (matching?.size !== 1) continue;
        form = [...matching][0];
      }
      if (region_exclusive_species[id] === form.split('-')[0]) form = 'base';
      const key = alias_key(id, form);
      if (!groups.has(key)) groups.set(key, { id, form, names: new Map() });
      const group = groups.get(key)!;
      for (const [language, name] of Object.entries(names)) {
        if (!group.names.has(language)) group.names.set(language, new Set());
        group.names.get(language)!.add(name);
      }
    }
  const aliases: Pokemon_Aliases = { dex: new Map(), names: new Map() };
  function add_alias(id: number, language: string, value: string, entry_id: string): void {
    aliases.dex.set(alias_key(id, language, casefold(value)), entry_id);
    const key = alias_key(language, casefold(value));
    if (!aliases.names.has(key)) aliases.names.set(key, new Set());
    aliases.names.get(key)!.add(entry_id);
  }
  const catalog: Pokemon[] = [];
  for (const { id, form, names: grouped_names } of [...groups.values()].sort(
    (a, b) => a.id - b.id || compare(a.form, b.form),
  )) {
    const entry_id = pokemon_entry_id(id, form),
      names: Record<string, string> = {};
    for (const language of [...grouped_names.keys()].sort(compare)) {
      const values = [...grouped_names.get(language)!];
      names[language] = values.sort(
        (a, b) =>
          Array.from(a).length - Array.from(b).length ||
          compare(casefold(a), casefold(b)) ||
          compare(a, b),
      )[0];
      for (const value of values) add_alias(id, language, value, entry_id);
    }
    catalog.push({
      id: entry_id,
      pokedex_id: id,
      name: names.en || Object.values(names)[0],
      names,
      form: form === 'base' ? null : (form.split('-')[0] as Pokemon['form']),
    });
  }
  for (const [id_string, names] of Object.entries(pokemon_overrides)) {
    const id = Number(id_string);
    let entry = catalog.find((row) => row.pokedex_id === id && row.form === null);
    if (!entry) {
      entry = {
        id: pokemon_entry_id(id, 'base'),
        pokedex_id: id,
        form: null,
        name: names.en,
        names,
      };
      catalog.push(entry);
    }
    entry.name = names.en;
    entry.names = { ...names };
    for (const [language, value] of Object.entries(names)) add_alias(id, language, value, entry.id);
  }
  for (const entry of catalog) {
    entry.names = Object.fromEntries(
      Object.entries(entry.names).filter(([language]) => language in language_names),
    );
    entry.name = entry.names.en || entry.name || entry.id;
  }
  catalog.sort(
    (a, b) =>
      a.pokedex_id - b.pokedex_id ||
      Number(a.form !== null) - Number(b.form !== null) ||
      compare(a.id, b.id),
  );
  return [catalog, aliases];
}
export function resolve_pokemon_ids(
  category: string,
  ids: number[],
  names: LocalizedText,
  aliases: Pokemon_Aliases,
): [string[], string] {
  if (category !== 'pokemon') return [[], 'not-pokemon'];
  const resolved: string[] = [];
  if (ids.length) {
    for (const id of ids) {
      const matches = new Set(
        Object.entries(names).flatMap(([language, name]) =>
          name
            ? pokemon_name_candidates(name)
                .map((candidate) => aliases.dex.get(alias_key(id, language, casefold(candidate))))
                .filter((value): value is string => !!value)
            : [],
        ),
      );
      if (matches.size > 1) {
        const non_base = [...matches].filter((match) => match !== pokemon_entry_id(id, 'base'));
        if (localized_form_type(names) !== 'base' && non_base.length === 1) {
          resolved.push(non_base[0]);
          continue;
        }
        return [[], 'ambiguous'];
      }
      if (matches.size === 1) resolved.push([...matches][0]);
      else if (localized_form_type(names) !== 'base') return [[], 'unmapped'];
      else resolved.push(pokemon_entry_id(id, 'base'));
    }
    return [[...new Set(resolved)], 'upstream-dex'];
  }
  let ambiguous = false;
  for (const [index, stage] of ['exact-name', 'normalized-name', 'owned-name'].entries()) {
    const matches = new Set(
      Object.entries(names).flatMap(([language, name]) =>
        name
          ? [
              ...(aliases.names.get(
                alias_key(language, casefold(pokemon_name_candidates(name)[index])),
              ) || []),
            ]
          : [],
      ),
    );
    if (matches.size === 1) return [[...matches], stage];
    if (matches.size > 1) ambiguous = true;
  }
  return [[], ambiguous ? 'ambiguous' : 'unmapped'];
}
export function normalize_variant_id(variant: Json): string {
  if (typeof variant === 'string')
    return variant_map[normalize_enum(variant)] || normalize_enum(variant);
  if (!object(variant)) return 'normal';
  const foil = variant.foil ? normalize_enum(variant.foil) : '';
  if (['masterball', 'master_ball'].includes(foil)) return 'master_ball';
  if (['pokeball', 'poke_ball'].includes(foil)) return 'poke_ball';
  if (variant.stamp && (!Array.isArray(variant.stamp) || variant.stamp.length)) return 'stamped';
  return variant_map[normalize_enum(variant.type)] || normalize_enum(variant.type) || 'normal';
}
export function variant_identifier(variant: Json): string {
  if (!object(variant)) return normalize_variant_id(variant);
  const parts = [normalize_variant_id(variant)];
  if (variant.subtype) parts.push(normalize_enum(variant.subtype));
  if (variant.foil) parts.push(normalize_enum(variant.foil));
  const stamps = variant.stamp || [];
  for (const stamp of Array.isArray(stamps) ? stamps : [stamps])
    if (stamp) parts.push(normalize_enum(stamp));
  return [...new Set(parts.filter(Boolean))].join('-');
}
export function normalize_variants(
  raw: Json_Object,
  languages: string[],
  updated_at: string,
  prices: Map<number, Json_Object>,
): CardVariant[] {
  const variants = Array.isArray(raw.variants)
    ? raw.variants
    : object(raw.variants)
      ? Object.entries(raw.variants)
          .filter(([, enabled]) => !!enabled)
          .map(([key]) => key)
      : ['normal'];
  const card_market_id = object(raw.thirdParty) ? raw.thirdParty.cardmarket : null;
  const used = new Set<string>();
  return variants.map((upstream, index) => {
    const type = normalize_variant_id(upstream);
    let id = variant_identifier(upstream);
    const third_party = object(upstream) && object(upstream.thirdParty) ? upstream.thirdParty : {};
    const variant_market_id = third_party.cardmarket ?? null;
    const product_id = Number.isInteger(variant_market_id) ? variant_market_id : card_market_id;
    if (used.has(id)) id += `-${Number.isInteger(product_id) ? product_id : index + 1}`;
    used.add(id);
    const variant: CardVariant = {
      id,
      type,
      images: Object.fromEntries(languages.map((language) => [language, ''])),
    };
    if (object(upstream)) {
      if (upstream.subtype) variant.subtype = String(upstream.subtype);
      if (upstream.foil) variant.foil = String(upstream.foil);
      if (upstream.stamp && (!Array.isArray(upstream.stamp) || upstream.stamp.length))
        variant.stamps = (Array.isArray(upstream.stamp) ? upstream.stamp : [upstream.stamp]).map(
          String,
        );
      if (Array.isArray(upstream.languages) && upstream.languages.length)
        variant.language_ids = upstream.languages.map((value) =>
          normalize_language_code(String(value)),
        );
    }
    if (typeof product_id === 'number' && Number.isInteger(product_id))
      variant.cardmarket = normalized_price(
        product_id,
        prices.get(product_id) || {},
        updated_at,
        variant_market_id === null && ['holo', 'reverse_holo'].includes(type),
        product_url(product_id),
      );
    return variant;
  });
}
export type Mapping_Diagnostics = {
  counts: Record<string, number>;
  ambiguous: { id: string; name: LocalizedText }[];
  unmapped: { id: string; name: LocalizedText }[];
};
function objects(value: Json | undefined): Json_Object[] {
  if (!value) return [];
  if (!Array.isArray(value) || !value.every(object)) throw new Error('Expected object list');
  return value;
}
export function normalize_card(
  path: string,
  set_id: string,
  languages: string[],
  aliases: Pokemon_Aliases,
  updated_at: string,
  prices: Map<number, Json_Object>,
  diagnostics?: Mapping_Diagnostics,
): Card {
  const raw = parse_typescript_object(path),
    category = normalize_enum(raw.category) as Card['category'];
  const number = basename(path, '.ts'),
    id = `${set_id}-${slugify(number)}`,
    name = normalize_localized_text(raw.name);
  const [pokemon, status] = resolve_pokemon_ids(category, dex_ids(raw), name, aliases);
  if (diagnostics && category === 'pokemon') {
    diagnostics.counts[status] = (diagnostics.counts[status] || 0) + 1;
    if (status === 'ambiguous' || status === 'unmapped') diagnostics[status].push({ id, name });
  }
  const card: Card = {
    id,
    set_id,
    number,
    category,
    name,
    pokemon,
    illustrator: (raw.illustrator as string | null) ?? null,
    rarity: normalize_enum(raw.rarity),
    regulation_mark: (raw.regulationMark as string | null) ?? null,
    variants: normalize_variants(raw, languages, updated_at, prices),
  };
  if (raw.hp != null) card.hp = Number(raw.hp);
  if (Array.isArray(raw.types) && raw.types.length) card.types = raw.types.map(normalize_energy);
  if (raw.stage) card.stage = normalize_enum(raw.stage);
  if (raw.evolveFrom) card.evolves_from = normalize_localized_text(raw.evolveFrom);
  if (raw.suffix) card.rule_box = String(raw.suffix);
  if (Array.isArray(raw.attacks) && raw.attacks.length)
    card.attacks = objects(raw.attacks).map((attack) => ({
      name: normalize_localized_text(attack.name),
      cost: (Array.isArray(attack.cost) ? attack.cost : []).map(normalize_energy),
      damage: String(attack.damage ?? ''),
      text: normalize_localized_text(attack.effect || attack.text),
    }));
  for (const field of ['weaknesses', 'resistances'] as const)
    if (Array.isArray(raw[field]) && raw[field].length)
      card[field] = objects(raw[field]).map((modifier) => ({
        type: normalize_energy(modifier.type),
        value: String(modifier.value ?? '').replaceAll('×', 'x'),
      }));
  if (raw.retreat != null) card.retreat_cost = Number(raw.retreat);
  if (raw.trainerType) card.trainer_type = normalize_enum(raw.trainerType);
  if (raw.effect) card.rules_text = normalize_localized_text(raw.effect);
  if (raw.description) card.flavor_text = normalize_localized_text(raw.description);
  if (object(raw.legal) && Object.keys(raw.legal).length)
    card.legalities = raw.legal as Record<string, string>;
  return card;
}
export function restrict_card_languages(card: Card, languages: string[]): void {
  const restrict = (value: LocalizedText) =>
    Object.fromEntries(Object.entries(value).filter(([language]) => languages.includes(language)));
  for (const field of ['name', 'evolves_from', 'rules_text', 'flavor_text'] as const)
    if (card[field]) card[field] = restrict(card[field]);
  for (const attack of card.attacks || []) {
    attack.name = restrict(attack.name);
    attack.text = restrict(attack.text);
  }
}
export function release_date_value(value: Json | undefined): string {
  return typeof value === 'string'
    ? value
    : object(value)
      ? Object.values(value).filter(Boolean).map(String).sort(compare)[0] || ''
      : '';
}
