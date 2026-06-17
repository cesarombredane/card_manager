import type { ApiRecord } from '../api/client';

type TableName =
  | 'abilities'
  | 'attacks'
  | 'card_concepts'
  | 'card_images'
  | 'card_prints'
  | 'card_texts'
  | 'import_jobs'
  | 'languages'
  | 'pokemon_card_details'
  | 'print_variants'
  | 'raw_import_records'
  | 'regions'
  | 'series'
  | 'set_relationships'
  | 'sets'
  | 'source_mappings'
  | 'sources';

type Tables = Record<TableName, ApiRecord[]>;

const tableNames: TableName[] = [
  'abilities',
  'attacks',
  'card_concepts',
  'card_images',
  'card_prints',
  'card_texts',
  'import_jobs',
  'languages',
  'pokemon_card_details',
  'print_variants',
  'raw_import_records',
  'regions',
  'series',
  'set_relationships',
  'sets',
  'source_mappings',
  'sources'
];

const tableModules = import.meta.glob<ApiRecord[]>('../../data/tables/*.json', {
  eager: true,
  import: 'default'
});

let tablesPromise: Promise<Tables> | null = null;

function lower(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function matches(value: unknown, query: unknown): boolean {
  const normalizedQuery = lower(query).replaceAll('%', '').trim();
  return normalizedQuery === '' || lower(value).includes(normalizedQuery);
}

function dateValue(value: unknown): number {
  if (!value) return 0;
  return new Date(String(value)).getTime();
}

function paginate<T>(rows: T[], limit: number, offset: number): T[] {
  return rows.slice(offset, offset + limit);
}

function parseLimitOffset(params: URLSearchParams): { limit: number; offset: number } {
  const limit = Math.min(Number(params.get('limit') ?? 25), 100);
  const offset = Math.max(Number(params.get('offset') ?? 0), 0);
  return {
    limit: Number.isFinite(limit) ? limit : 25,
    offset: Number.isFinite(offset) ? offset : 0
  };
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

function uniqueBy<T extends ApiRecord>(rows: T[], key: string): T[] {
  return [...new Map(rows.map((row) => [row[key], row])).values()];
}

function mapById(rows: ApiRecord[]): Map<string, ApiRecord> {
  return new Map(rows.map((row) => [row.id, row]));
}

function groupBy(rows: ApiRecord[], key: string): Map<string, ApiRecord[]> {
  const grouped = new Map<string, ApiRecord[]>();
  for (const row of rows) {
    const groupKey = String(row[key] ?? '');
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)?.push(row);
  }
  return grouped;
}

async function loadTables(): Promise<Tables> {
  if (!tablesPromise) {
    tablesPromise = Promise.resolve(Object.fromEntries(tableNames.map((tableName) => {
      const modulePath = `../../data/tables/${tableName}.json`;
      const rows = tableModules[modulePath];

      if (!rows) {
        throw new Error(`Unable to load ${modulePath}`);
      }

      return [tableName, rows] as const;
    })) as Tables);
  }

  return tablesPromise;
}

class LocalCatalog {
  private languagesById: Map<string, ApiRecord>;
  private regionsById: Map<string, ApiRecord>;
  private seriesById: Map<string, ApiRecord>;
  private setsById: Map<string, ApiRecord>;
  private conceptsById: Map<string, ApiRecord>;
  private printsById: Map<string, ApiRecord>;
  private variantsById: Map<string, ApiRecord>;
  private sourcesById: Map<string, ApiRecord>;
  private detailsByConceptId: Map<string, ApiRecord>;
  private printsByConceptId: Map<string, ApiRecord[]>;
  private variantsByPrintId: Map<string, ApiRecord[]>;
  private imagesByVariantId: Map<string, ApiRecord[]>;
  private textsByConceptId: Map<string, ApiRecord[]>;
  private attacksByConceptId: Map<string, ApiRecord[]>;
  private abilitiesByConceptId: Map<string, ApiRecord[]>;

  constructor(private tables: Tables) {
    this.languagesById = mapById(tables.languages);
    this.regionsById = mapById(tables.regions);
    this.seriesById = mapById(tables.series);
    this.setsById = mapById(tables.sets);
    this.conceptsById = mapById(tables.card_concepts);
    this.printsById = mapById(tables.card_prints);
    this.variantsById = mapById(tables.print_variants);
    this.sourcesById = mapById(tables.sources);
    this.detailsByConceptId = new Map(tables.pokemon_card_details.map((row) => [row.card_concept_id, row]));
    this.printsByConceptId = groupBy(tables.card_prints, 'card_concept_id');
    this.variantsByPrintId = groupBy(tables.print_variants, 'card_print_id');
    this.imagesByVariantId = groupBy(tables.card_images, 'print_variant_id');
    this.textsByConceptId = groupBy(tables.card_texts, 'card_concept_id');
    this.attacksByConceptId = groupBy(tables.attacks, 'card_concept_id');
    this.abilitiesByConceptId = groupBy(tables.abilities, 'card_concept_id');
  }

  route(path: string, params: URLSearchParams): ApiRecord {
    if (path === '/api/health') return this.health();
    if (path === '/api/languages') return { languages: this.listLanguages() };
    if (path.startsWith('/api/languages/')) return this.languageDetail(decodeURIComponent(path.replace('/api/languages/', '')));
    if (path === '/api/sets') return this.sets(params);
    if (path.startsWith('/api/sets/')) return this.setRoute(path);
    if (path === '/api/series') return this.series(params);
    if (path.startsWith('/api/series/')) return this.seriesDetail(path.replace('/api/series/', ''));
    if (path === '/api/pokemon') return this.pokemon(params);
    if (path.startsWith('/api/pokemon/')) return this.pokemonRoute(path);
    if (path === '/api/artists') return this.artists(params);
    if (path.startsWith('/api/artists/')) return this.artistDetail(decodeURIComponent(path.replace('/api/artists/', '')));
    if (path === '/api/cards/search') return this.cards(params);
    if (path === '/api/search') return this.search(params);
    if (path.startsWith('/api/card-concepts/')) return this.cardConceptRoute(path);
    if (path.startsWith('/api/card-prints/')) return this.cardPrintDetail(path.replace('/api/card-prints/', ''));
    if (path.startsWith('/api/print-variants/')) return this.printVariantDetail(path.replace('/api/print-variants/', ''));
    if (path === '/api/compare/concepts') return this.compare(params);
    throw new Error(`Unknown local data route: ${path}`);
  }

  private health(): ApiRecord {
    return {
      status: 'ok',
      service: 'card-manager-static',
      environment: 'development',
      dataStore: 'json',
      records: Object.fromEntries(Object.entries(this.tables).map(([name, rows]) => [name, rows.length]))
    };
  }

  private language(id: string): ApiRecord | null {
    return this.languagesById.get(id) ?? null;
  }

  private region(id: string): ApiRecord | null {
    return this.regionsById.get(id) ?? null;
  }

  private serie(id: string): ApiRecord | null {
    return this.seriesById.get(id) ?? null;
  }

  private set(id: string): ApiRecord | null {
    return this.setsById.get(id) ?? null;
  }

  private concept(id: string): ApiRecord | null {
    return this.conceptsById.get(id) ?? null;
  }

  private withSeries(series: ApiRecord): ApiRecord {
    const language = this.language(series.language_id);
    const region = this.region(series.region_id);
    return {
      ...series,
      language,
      region,
      language_code: language?.code,
      region_code: region?.code,
      set_count: this.tables.sets.filter((set) => set.series_id === series.id).length
    };
  }

  private withSet(set: ApiRecord): ApiRecord {
    const language = this.language(set.language_id);
    const region = this.region(set.region_id);
    const series = this.serie(set.series_id);
    return {
      ...set,
      language,
      region,
      series,
      language_code: language?.code,
      region_code: region?.code,
      series_name: series?.name
    };
  }

  private printVariants(printId: string): ApiRecord[] {
    return [...(this.variantsByPrintId.get(printId) ?? [])].sort((a, b) => lower(a.variant_type).localeCompare(lower(b.variant_type)));
  }

  private variantImages(variantId: string): ApiRecord[] {
    return [...(this.imagesByVariantId.get(variantId) ?? [])].sort((a, b) => Number(b.is_front) - Number(a.is_front));
  }

  private printImages(printId: string): ApiRecord[] {
    return this.printVariants(printId).flatMap((variant) => this.variantImages(variant.id));
  }

  private firstPrintImage(printId: string): string | null {
    return this.printImages(printId)[0]?.image_url ?? null;
  }

  private withPrint(print: ApiRecord): ApiRecord {
    const concept = this.concept(print.card_concept_id);
    const set = this.set(print.set_id);
    const series = set ? this.serie(set.series_id) : null;
    const language = this.language(print.language_id);
    const region = set ? this.region(set.region_id) : null;
    return {
      ...print,
      concept,
      set: set ? this.withSet(set) : null,
      series,
      language,
      region,
      canonical_name: concept?.canonical_name,
      language_code: language?.code,
      set_name: set?.name,
      set_code: set?.set_code,
      image_url: this.firstPrintImage(print.id)
    };
  }

  private conceptPrints(conceptId: string): ApiRecord[] {
    return [...(this.printsByConceptId.get(conceptId) ?? [])]
      .map((print) => this.withPrint(print))
      .sort((a, b) => dateValue(a.release_date) - dateValue(b.release_date) || lower(a.language_code).localeCompare(lower(b.language_code)));
  }

  private conceptTexts(conceptId: string): ApiRecord[] {
    return [...(this.textsByConceptId.get(conceptId) ?? [])]
      .map((text) => ({
        ...text,
        language_code: this.language(text.language_id)?.code,
        language_name: this.language(text.language_id)?.name
      }))
      .sort((a, b) => lower(a.language_code).localeCompare(lower(b.language_code)));
  }

  private conceptVariants(conceptId: string): ApiRecord[] {
    return (this.printsByConceptId.get(conceptId) ?? []).flatMap((print) => this.printVariants(print.id));
  }

  private sourcesFor(entityType: string, entityId: string): ApiRecord[] {
    return this.tables.source_mappings
      .filter((sourceMapping) => sourceMapping.entity_type === entityType && sourceMapping.entity_id === entityId)
      .map((sourceMapping) => ({
        ...sourceMapping,
        source_name: this.sourcesById.get(sourceMapping.source_id)?.name,
        source_type: this.sourcesById.get(sourceMapping.source_id)?.source_type
      }));
  }

  private languageStats(languageId: string): ApiRecord {
    const sets = this.tables.sets.filter((set) => set.language_id === languageId);
    const prints = this.tables.card_prints.filter((print) => print.language_id === languageId);
    const dates = sets.map((set) => set.release_date).filter(Boolean).sort();
    return {
      set_count: sets.length,
      print_count: prints.length,
      concept_count: new Set(prints.map((print) => print.card_concept_id)).size,
      first_release_date: dates[0] ?? null,
      last_release_date: dates.at(-1) ?? null
    };
  }

  private listLanguages(): ApiRecord[] {
    return this.tables.languages
      .map((language) => ({ ...language, ...this.languageStats(language.id) }))
      .sort((a, b) => lower(a.code).localeCompare(lower(b.code)));
  }

  private listSeries(filters: ApiRecord): ApiRecord[] {
    return this.tables.series
      .map((series) => this.withSeries(series))
      .filter((series) => matches(series.name, filters.q) || matches(series.local_name, filters.q))
      .filter((series) => !filters.language || series.language_code === filters.language)
      .filter((series) => !filters.region || series.region_code === filters.region)
      .filter((series) => !filters.startDateFrom || String(series.start_date ?? '') >= String(filters.startDateFrom))
      .filter((series) => !filters.startDateTo || String(series.start_date ?? '') <= String(filters.startDateTo))
      .sort((a, b) => dateValue(b.start_date) - dateValue(a.start_date));
  }

  private listSets(filters: ApiRecord): ApiRecord[] {
    const sort = String(filters.sort ?? 'releaseDate');
    const rows = this.tables.sets
      .map((set) => this.withSet(set))
      .filter((set) => matches(set.name, filters.q) || matches(set.local_name, filters.q) || matches(set.set_code, filters.q))
      .filter((set) => !filters.language || set.language_code === filters.language)
      .filter((set) => !filters.region || set.region_code === filters.region)
      .filter((set) => !filters.seriesId || set.series_id === filters.seriesId)
      .filter((set) => !filters.setType || set.set_type === filters.setType)
      .filter((set) => !filters.releaseDateFrom || String(set.release_date ?? '') >= String(filters.releaseDateFrom))
      .filter((set) => !filters.releaseDateTo || String(set.release_date ?? '') <= String(filters.releaseDateTo));

    if (sort === 'name') rows.sort((a, b) => lower(a.name).localeCompare(lower(b.name)));
    else if (sort === 'code') rows.sort((a, b) => lower(a.set_code).localeCompare(lower(b.set_code)));
    else rows.sort((a, b) => dateValue(b.release_date) - dateValue(a.release_date));
    return rows;
  }

  private printMatchesFilters(print: ApiRecord, filters: ApiRecord): boolean {
    const set = this.set(print.set_id);
    const region = set ? this.region(set.region_id) : null;
    const variants = this.printVariants(print.id);
    const images = this.printImages(print.id);
    return (!filters.language || this.language(print.language_id)?.code === filters.language)
      && (!filters.region || region?.code === filters.region)
      && (!filters.setId || print.set_id === filters.setId)
      && (!filters.seriesId || set?.series_id === filters.seriesId)
      && (!filters.rarity || matches(print.rarity, filters.rarity))
      && (!filters.variantType || variants.some((variant) => variant.variant_type === filters.variantType))
      && (!filters.setType || set?.set_type === filters.setType)
      && (filters.isPromo === undefined || print.is_promo === filters.isPromo)
      && (filters.isJumbo === undefined || print.is_jumbo === filters.isJumbo)
      && (filters.isDeckExclusive === undefined || print.is_deck_exclusive === filters.isDeckExclusive)
      && (!filters.releaseDateFrom || String(print.release_date ?? '') >= String(filters.releaseDateFrom))
      && (!filters.releaseDateTo || String(print.release_date ?? '') <= String(filters.releaseDateTo))
      && (filters.hasImage === undefined || !filters.hasImage || images.length > 0)
      && (filters.missingImage === undefined || !filters.missingImage || images.length === 0);
  }

  private conceptMatchesText(concept: ApiRecord, prints: ApiRecord[], query: unknown): boolean {
    const attacks = this.attacksByConceptId.get(concept.id) ?? [];
    const abilities = this.abilitiesByConceptId.get(concept.id) ?? [];
    const sets = prints.map((print) => this.set(print.set_id));
    return matches(concept.canonical_name, query)
      || matches(concept.artist, query)
      || matches(concept.original_card_number, query)
      || prints.some((print) => matches(print.printed_name, query) || matches(print.card_number, query))
      || sets.some((set) => matches(set?.name, query) || matches(set?.local_name, query) || matches(set?.set_code, query))
      || attacks.some((attack) => matches(attack.name, query) || matches(attack.text, query))
      || abilities.some((ability) => matches(ability.name, query) || matches(ability.text, query));
  }

  private searchCardConcepts(filters: ApiRecord): ApiRecord[] {
    const rows = this.tables.card_concepts.flatMap((concept) => {
      const details = this.detailsByConceptId.get(concept.id);
      const attacks = this.attacksByConceptId.get(concept.id) ?? [];
      const abilities = this.abilitiesByConceptId.get(concept.id) ?? [];
      const prints = (this.printsByConceptId.get(concept.id) ?? []).filter((print) => this.printMatchesFilters(print, filters));
      if (prints.length === 0) return [];
      if (!this.conceptMatchesText(concept, prints, filters.q)) return [];
      if (filters.artist && !matches(concept.artist, filters.artist)) return [];
      if (filters.cardCategory && concept.card_category !== filters.cardCategory) return [];
      if (filters.hpMin && Number(details?.hp ?? 0) < Number(filters.hpMin)) return [];
      if (filters.hpMax && Number(details?.hp ?? 0) > Number(filters.hpMax)) return [];
      if (filters.pokemonType && !matches(details?.pokemon_type, filters.pokemonType)) return [];
      if (filters.stage && !matches(details?.stage, filters.stage)) return [];
      if (filters.hasAbility !== undefined && (abilities.length > 0) !== filters.hasAbility) return [];
      if (filters.attackName && !attacks.some((attack) => matches(attack.name, filters.attackName))) return [];
      if (filters.regulationMark && concept.regulation_mark !== filters.regulationMark) return [];

      const matchingPrints = prints.map((print) => this.withPrint(print));
      const imagePreview = prints.map((print) => this.firstPrintImage(print.id)).find(Boolean) ?? null;
      const originalPrint = prints.find((print) => print.set_id === concept.original_set_id && print.card_number === concept.original_card_number) ?? prints[0];
      return [{
        id: concept.id,
        canonical_name: concept.canonical_name,
        card_category: concept.card_category,
        artist: concept.artist,
        regulation_mark: concept.regulation_mark,
        original_print: originalPrint ? { id: originalPrint.id, printed_name: originalPrint.printed_name, card_number: originalPrint.card_number } : null,
        print_count: new Set(prints.map((print) => print.id)).size,
        language_count: new Set(prints.map((print) => print.language_id)).size,
        variant_count: prints.reduce((count, print) => count + this.printVariants(print.id).length, 0),
        image_preview: imagePreview,
        matching_prints: matchingPrints.map((print) => ({
          id: print.id,
          printed_name: print.printed_name,
          card_number: print.card_number,
          rarity: print.rarity,
          language: print.language_code,
          set_name: print.set_name,
          set_code: print.set_code
        }))
      }];
    });

    const sort = String(filters.sort ?? 'name');
    if (sort === 'printCount') rows.sort((a, b) => b.print_count - a.print_count);
    else if (sort === 'languageCount') rows.sort((a, b) => b.language_count - a.language_count);
    else rows.sort((a, b) => lower(a.canonical_name).localeCompare(lower(b.canonical_name)));
    return rows;
  }

  private artistRows(query: unknown): ApiRecord[] {
    const counts = new Map<string, number>();
    for (const concept of this.tables.card_concepts) {
      if (!concept.artist || !matches(concept.artist, query)) continue;
      counts.set(concept.artist, (counts.get(concept.artist) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, concept_count]) => ({ name, concept_count }))
      .sort((a, b) => b.concept_count - a.concept_count || lower(a.name).localeCompare(lower(b.name)));
  }

  private pokemonRows(query: unknown): ApiRecord[] {
    const counts = new Map<string, number>();
    for (const concept of this.tables.card_concepts) {
      if (concept.card_category !== 'pokemon' || !matches(concept.canonical_name, query)) continue;
      counts.set(concept.canonical_name, (counts.get(concept.canonical_name) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, concept_count]) => ({ name, concept_count }))
      .sort((a, b) => b.concept_count - a.concept_count || lower(a.name).localeCompare(lower(b.name)));
  }

  private languageDetail(code: string): ApiRecord {
    const language = this.tables.languages.find((row) => row.code === code);
    if (!language) throw new Error('Language not found');
    const series = this.tables.series.filter((row) => row.language_id === language.id);
    const sets = this.tables.sets.filter((row) => row.language_id === language.id);
    return { language, series, sets, prints: [], missingMappings: [], stats: this.languageStats(language.id) };
  }

  private sets(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    const results = paginate(this.listSets({
      q: params.get('q') ?? '',
      language: params.get('language'),
      region: params.get('region'),
      seriesId: params.get('seriesId'),
      setType: params.get('setType'),
      releaseDateFrom: params.get('releaseDateFrom'),
      releaseDateTo: params.get('releaseDateTo'),
      sort: params.get('sort') ?? 'releaseDate'
    }), limit, offset);
    return { results, limit, offset };
  }

  private setRoute(path: string): ApiRecord | ApiRecord[] {
    const [, suffix] = path.replace('/api/sets/', '').split('/');
    const id = path.replace('/api/sets/', '').split('/')[0];
    const set = this.set(id);
    if (!set) throw new Error('Set not found');
    const cards = this.tables.card_prints.filter((print) => print.set_id === id).map((print) => this.withPrint(print));
    if (suffix === 'cards') return cards;
    if (suffix === 'relationships') return this.tables.set_relationships.filter((relationship) => relationship.source_set_id === id || relationship.target_set_id === id);
    if (suffix === 'stats') return {
      print_count: cards.length,
      concept_count: new Set(cards.map((card) => card.card_concept_id)).size,
      variant_count: this.tables.print_variants.filter((variant) => cards.some((card) => card.id === variant.card_print_id)).length
    };
    const relationships = this.tables.set_relationships.filter((relationship) => relationship.source_set_id === id || relationship.target_set_id === id);
    return {
      set: this.withSet(set),
      cards,
      relatedSets: relationships,
      sourceSets: relationships.filter((relationship) => relationship.target_set_id === id),
      localizedTargetSets: relationships.filter((relationship) => relationship.source_set_id === id),
      stats: { print_count: cards.length, concept_count: new Set(cards.map((card) => card.card_concept_id)).size, language_count: new Set(cards.map((card) => card.language_id)).size },
      sources: this.sourcesFor('set', id)
    };
  }

  private series(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    const results = paginate(this.listSeries({
      q: params.get('q') ?? '',
      language: params.get('language'),
      region: params.get('region'),
      startDateFrom: params.get('startDateFrom'),
      startDateTo: params.get('startDateTo')
    }), limit, offset);
    return { results, limit, offset };
  }

  private seriesDetail(id: string): ApiRecord {
    const series = this.serie(id);
    if (!series) throw new Error('Series not found');
    const sets = this.tables.sets.filter((set) => set.series_id === id).map((set) => this.withSet(set));
    return {
      series: this.withSeries(series),
      sets,
      stats: { set_count: sets.length, print_count: this.tables.card_prints.filter((print) => sets.some((set) => set.id === print.set_id)).length },
      relatedSeries: []
    };
  }

  private pokemon(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    return { results: paginate(this.pokemonRows(params.get('q') ?? ''), limit, offset), limit, offset };
  }

  private pokemonRoute(path: string): ApiRecord | ApiRecord[] {
    const raw = path.replace('/api/pokemon/', '');
    const timeline = raw.endsWith('/timeline');
    const name = decodeURIComponent(timeline ? raw.replace('/timeline', '') : raw);
    const concepts = this.tables.card_concepts.filter((concept) => concept.card_category === 'pokemon' && lower(concept.canonical_name) === lower(name));
    const prints = concepts.flatMap((concept) => this.conceptPrints(concept.id));
    const timelineRows = prints.map((print) => ({ release_date: print.release_date, printed_name: print.printed_name }));
    if (timeline) return timelineRows;
    return {
      pokemon: { name },
      concepts,
      prints,
      promos: prints.filter((print) => print.is_promo),
      variants: concepts.flatMap((concept) => this.conceptVariants(concept.id)),
      sets: uniqueBy(prints.map((print) => this.set(print.set_id)).filter(Boolean) as ApiRecord[], 'id'),
      artists: uniqueBy(concepts.filter((concept) => concept.artist).map((concept) => ({ artist: concept.artist })), 'artist'),
      languages: uniqueBy(prints.map((print) => this.language(print.language_id)).filter(Boolean) as ApiRecord[], 'id'),
      timelineSummary: timelineRows
    };
  }

  private artists(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    return { results: paginate(this.artistRows(params.get('q') ?? ''), limit, offset), limit, offset };
  }

  private artistDetail(artist: string): ApiRecord {
    const concepts = this.tables.card_concepts.filter((concept) => lower(concept.artist) === lower(artist));
    const prints = concepts.flatMap((concept) => this.conceptPrints(concept.id));
    return {
      artist,
      concepts,
      prints,
      pokemonIllustrated: [],
      sets: uniqueBy(prints.map((print) => this.set(print.set_id)).filter(Boolean) as ApiRecord[], 'id'),
      timeline: prints.map((print) => ({ release_date: print.release_date, printed_name: print.printed_name })),
      languages: uniqueBy(prints.map((print) => this.language(print.language_id)).filter(Boolean) as ApiRecord[], 'id')
    };
  }

  private cards(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    const results = paginate(this.searchCardConcepts({
      q: params.get('q') ?? '',
      language: params.get('language'),
      region: params.get('region'),
      setId: params.get('setId'),
      seriesId: params.get('seriesId'),
      artist: params.get('artist'),
      cardCategory: params.get('cardCategory'),
      rarity: params.get('rarity'),
      variantType: params.get('variantType'),
      setType: params.get('setType'),
      releaseDateFrom: params.get('releaseDateFrom'),
      releaseDateTo: params.get('releaseDateTo'),
      hpMin: params.get('hpMin'),
      hpMax: params.get('hpMax'),
      pokemonType: params.get('pokemonType'),
      stage: params.get('stage'),
      hasAbility: parseBoolean(params.get('hasAbility')),
      attackName: params.get('attackName'),
      regulationMark: params.get('regulationMark'),
      hasImage: parseBoolean(params.get('hasImage')),
      missingImage: parseBoolean(params.get('missingImage')),
      isPromo: parseBoolean(params.get('isPromo')),
      isJumbo: parseBoolean(params.get('isJumbo')),
      isDeckExclusive: parseBoolean(params.get('isDeckExclusive')),
      sort: params.get('sort') ?? 'name'
    }), limit, offset);
    return { results, limit, offset };
  }

  private search(params: URLSearchParams): ApiRecord {
    const q = params.get('q') ?? '';
    const type = params.get('type') ?? 'all';
    const language = params.get('language');
    const { limit, offset } = parseLimitOffset(params);
    const wants = (name: string): boolean => type === 'all' || type === name;
    const results: ApiRecord = { cards: [], concepts: [], prints: [], pokemon: [], sets: [], series: [], artists: [] };
    if (wants('concepts') || wants('cards')) {
      results.concepts = paginate(this.searchCardConcepts({ q, language }).map((concept) => ({
        id: concept.id,
        canonical_name: concept.canonical_name,
        card_category: concept.card_category,
        artist: concept.artist,
        regulation_mark: concept.regulation_mark
      })), limit, offset);
      results.cards = results.concepts;
    }
    if (wants('prints')) {
      results.prints = paginate(this.tables.card_prints.map((print) => this.withPrint(print))
        .filter((print) => !language || print.language_code === language)
        .filter((print) => [print.printed_name, print.card_number, print.rarity, print.set_name, print.set_code].some((value) => matches(value, q))), limit, offset);
    }
    if (wants('sets')) results.sets = paginate(this.listSets({ q, language }), limit, offset);
    if (wants('series')) results.series = paginate(this.listSeries({ q, language }), limit, offset);
    if (wants('artists')) results.artists = paginate(this.artistRows(q), limit, offset);
    return results;
  }

  private cardConceptRoute(path: string): ApiRecord | ApiRecord[] {
    const [id, suffix] = path.replace('/api/card-concepts/', '').split('/');
    const concept = this.concept(id);
    if (!concept) throw new Error('Card concept not found');
    if (suffix === 'prints') return this.conceptPrints(id);
    if (suffix === 'languages') return this.conceptTexts(id).map((text) => ({ id: text.language_id, code: text.language_code, name: text.language_name }));
    if (suffix === 'variants') return this.conceptVariants(id);
    if (suffix === 'timeline') return this.conceptPrints(id).map((print) => ({ id: print.id, printed_name: print.printed_name, release_date: print.release_date, language: print.language_code, set_name: print.set_name }));
    if (suffix === 'sources') return this.sourcesFor('card_concept', id);
    return {
      concept: {
        ...concept,
        original_language: concept.original_language_id ? this.language(concept.original_language_id) : null,
        original_set: concept.original_set_id ? this.set(concept.original_set_id) : null,
        pokemon_details: this.detailsByConceptId.get(id) ?? null
      },
      attacks: (this.attacksByConceptId.get(id) ?? []).sort((a, b) => Number(a.attack_order) - Number(b.attack_order)),
      abilities: this.abilitiesByConceptId.get(id) ?? [],
      texts: this.conceptTexts(id),
      prints: this.conceptPrints(id),
      variants: this.conceptVariants(id),
      images: this.conceptPrints(id).flatMap((print) => this.printImages(print.id)),
      sources: this.sourcesFor('card_concept', id),
      relatedConcepts: []
    };
  }

  private cardPrintDetail(id: string): ApiRecord {
    const print = this.printsById.get(id);
    if (!print) throw new Error('Card print not found');
    return {
      print: this.withPrint(print),
      variants: this.printVariants(id),
      images: this.printImages(id),
      otherPrints: this.conceptPrints(print.card_concept_id).filter((otherPrint) => otherPrint.id !== id),
      sources: this.sourcesFor('card_print', id)
    };
  }

  private printVariantDetail(id: string): ApiRecord {
    const variant = this.variantsById.get(id);
    if (!variant) throw new Error('Print variant not found');
    const print = this.printsById.get(variant.card_print_id);
    return {
      variant: { ...variant, print, concept: print ? this.concept(print.card_concept_id) : null },
      images: this.variantImages(id),
      sources: this.sourcesFor('print_variant', id)
    };
  }

  private compare(params: URLSearchParams): ApiRecord {
    const ids = String(params.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    const concepts = ids.map((id) => {
      const concept = this.concept(id);
      if (!concept) return null;
      return {
        ...concept,
        texts: this.conceptTexts(id).map((text) => ({ language: text.language_code, name: text.name })),
        print_count: this.conceptPrints(id).length,
        variant_count: this.conceptVariants(id).length
      };
    }).filter(Boolean);
    return { concepts };
  }
}

export async function localGet<T = ApiRecord>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const tables = await loadTables();
  return new LocalCatalog(tables).route(url.pathname, url.searchParams) as T;
}
