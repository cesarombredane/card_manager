import type { ApiRecord } from '../api/client';

type TableName = 'languages' | 'regions' | 'series' | 'sets';
type Tables = Record<TableName, ApiRecord[]>;

const tableNames: TableName[] = ['languages', 'regions', 'series', 'sets'];

const tableModules = import.meta.glob<ApiRecord[]>('../../data/*.json', {
  eager: true,
  import: 'default'
});

let tablesPromise: Promise<Tables> | null = null;

function lower(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

function matches(value: unknown, query: unknown): boolean {
  const normalizedQuery = lower(query).trim();
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

function mapById(rows: ApiRecord[]): Map<string, ApiRecord> {
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function loadTables(): Promise<Tables> {
  if (!tablesPromise) {
    tablesPromise = Promise.resolve(Object.fromEntries(tableNames.map((tableName) => {
      const modulePath = `../../data/${tableName}.json`;
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

  constructor(private tables: Tables) {
    this.languagesById = mapById(tables.languages);
    this.regionsById = mapById(tables.regions);
    this.seriesById = mapById(tables.series);
    this.setsById = mapById(tables.sets);
  }

  route(path: string, params: URLSearchParams): ApiRecord {
    if (path === '/api/health') return this.health();
    if (path === '/api/languages') return { languages: this.listLanguages() };
    if (path.startsWith('/api/languages/')) return this.languageDetail(decodeURIComponent(path.replace('/api/languages/', '')));
    if (path === '/api/regions') return { regions: this.listRegions() };
    if (path.startsWith('/api/regions/')) return this.regionDetail(path.replace('/api/regions/', ''));
    if (path === '/api/series') return this.series(params);
    if (path.startsWith('/api/series/')) return this.seriesDetail(path.replace('/api/series/', ''));
    if (path === '/api/sets') return this.sets(params);
    if (path.startsWith('/api/sets/')) return this.setDetail(path.replace('/api/sets/', '').split('/')[0]);

    if (path === '/api/pokemon') return { results: [], limit: 0, offset: 0 };
    if (path === '/api/artists') return { results: [], limit: 0, offset: 0 };
    if (path === '/api/cards/search') return { results: [], limit: 0, offset: 0 };
    if (path === '/api/search') return { cards: [], concepts: [], prints: [], pokemon: [], sets: this.listSets({}), series: this.listSeries({}), artists: [] };

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

  private language(id: unknown): ApiRecord | null {
    return this.languagesById.get(String(id)) ?? null;
  }

  private region(id: unknown): ApiRecord | null {
    return this.regionsById.get(String(id)) ?? null;
  }

  private serie(id: unknown): ApiRecord | null {
    return this.seriesById.get(String(id)) ?? null;
  }

  private languages(ids: unknown): ApiRecord[] {
    return Array.isArray(ids) ? ids.map((id) => this.language(id)).filter(Boolean) as ApiRecord[] : [];
  }

  private withRegion(region: ApiRecord): ApiRecord {
    const series = this.tables.series.filter((row) => row.region_id === region.id);
    const sets = this.tables.sets.filter((set) => series.some((serie) => serie.id === set.series_id));
    const languageIds = [...new Set(sets.flatMap((set) => Array.isArray(set.language_ids) ? set.language_ids : []))];
    const languages = this.languages(languageIds);

    return {
      ...region,
      languages,
      series_count: series.length,
      set_count: sets.length
    };
  }

  private withSeries(series: ApiRecord): ApiRecord {
    const region = this.region(series.region_id);
    const sets = this.tables.sets.filter((set) => set.series_id === series.id);

    return {
      ...series,
      region,
      region_code: region?.id,
      region_name: region?.name,
      set_count: sets.length
    };
  }

  private withSet(set: ApiRecord): ApiRecord {
    const series = this.serie(set.series_id);
    const region = series ? this.region(series.region_id) : null;
    const languages = this.languages(set.language_ids);
    const basedOnSets = Array.isArray(set.based_on_set_ids)
      ? set.based_on_set_ids.map((id: string) => this.setsById.get(id)).filter(Boolean)
      : [];

    return {
      ...set,
      series,
      region,
      languages,
      based_on_sets: basedOnSets,
      language_codes: languages.map((language) => language.id),
      language_names: languages.map((language) => language.name),
      region_code: region?.id,
      region_name: region?.name,
      series_name: series?.name
    };
  }

  private listLanguages(): ApiRecord[] {
    return this.tables.languages
      .map((language): ApiRecord => {
        const sets = this.tables.sets.filter((set) => Array.isArray(set.language_ids) && set.language_ids.includes(language.id));
        const seriesIds = new Set(sets.map((set) => set.series_id));
        const regions = this.tables.regions.filter((region) => this.tables.series.some((series) => seriesIds.has(series.id) && series.region_id === region.id));

        return {
          ...language,
          regions: regions.map((region) => this.withRegion(region)),
          region_codes: regions.map((region) => region.id),
          set_count: sets.length
        };
      })
      .sort((a, b) => lower(a.name).localeCompare(lower(b.name)));
  }

  private listRegions(): ApiRecord[] {
    return this.tables.regions
      .map((region) => this.withRegion(region))
      .sort((a, b) => lower(a.name).localeCompare(lower(b.name)));
  }

  private listSeries(filters: ApiRecord): ApiRecord[] {
    return this.tables.series
      .map((series) => this.withSeries(series))
      .filter((series) => matches(series.name, filters.q))
      .filter((series) => !filters.region || series.region_id === filters.region)
      .sort((a, b) => dateValue(b.start_date) - dateValue(a.start_date));
  }

  private listSets(filters: ApiRecord): ApiRecord[] {
    const sort = String(filters.sort ?? 'releaseDate');
    const rows = this.tables.sets
      .map((set) => this.withSet(set))
      .filter((set) => matches(set.name, filters.q) || matches(set.local_name, filters.q) || matches(set.id, filters.q))
      .filter((set) => !filters.region || set.region?.id === filters.region)
      .filter((set) => !filters.seriesId || set.series_id === filters.seriesId)
      .filter((set) => !filters.language || set.language_ids.includes(filters.language));

    if (sort === 'name') rows.sort((a, b) => lower(a.name).localeCompare(lower(b.name)));
    else rows.sort((a, b) => dateValue(b.release_date) - dateValue(a.release_date));
    return rows;
  }

  private languageDetail(code: string): ApiRecord {
    const language = this.language(code);
    if (!language) throw new Error('Language not found');
    const sets = this.listSets({ language: code });
    return { language, sets, stats: { set_count: sets.length } };
  }

  private regionDetail(id: string): ApiRecord {
    const region = this.region(id);
    if (!region) throw new Error('Region not found');
    const series = this.listSeries({ region: id });
    const sets = this.listSets({ region: id });
    return { region: this.withRegion(region), series, sets };
  }

  private series(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    return {
      results: paginate(this.listSeries({
        q: params.get('q') ?? '',
        region: params.get('region')
      }), limit, offset),
      limit,
      offset
    };
  }

  private seriesDetail(id: string): ApiRecord {
    const series = this.serie(id);
    if (!series) throw new Error('Series not found');
    const sets = this.listSets({ seriesId: id });
    return { series: this.withSeries(series), sets, stats: { set_count: sets.length } };
  }

  private sets(params: URLSearchParams): ApiRecord {
    const { limit, offset } = parseLimitOffset(params);
    return {
      results: paginate(this.listSets({
        q: params.get('q') ?? '',
        region: params.get('region'),
        language: params.get('language'),
        seriesId: params.get('seriesId'),
        sort: params.get('sort') ?? 'releaseDate'
      }), limit, offset),
      limit,
      offset
    };
  }

  private setDetail(id: string): ApiRecord {
    const set = this.setsById.get(id);
    if (!set) throw new Error('Set not found');
    return {
      set: this.withSet(set),
      cards: [],
      stats: { card_count: 0, language_count: set.language_ids.length }
    };
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
