<template>
  <q-page class="bg-dark q-pa-md q-pa-lg-md">
    <section class="coverage-header q-mb-lg">
      <div>
        <div class="text-overline text-primary">Catalog health</div>
        <h1 class="text-h4 text-weight-bold q-my-xs">Data coverage</h1>
        <div class="text-body2 text_secondary">Generated {{ generated_at }}</div>
      </div>
      <q-btn flat round icon="refresh" no-caps aria-label="refresh" @click="reload_page"
        ><q-tooltip :delay="1000">Reload coverage</q-tooltip></q-btn
      >
    </section>

    <q-banner v-if="!coverage" class="app_surface text_secondary"
      >Coverage data has not been generated yet.</q-banner
    >

    <template v-else>
      <section class="metric-grid q-mb-lg" aria-label="Coverage totals">
        <div v-for="metric in summary_metrics" :key="metric.label" class="metric-block">
          <q-icon :name="metric.icon" size="22px" class="text-primary" />
          <div class="text-h5 text-weight-bold q-mt-sm">{{ format_number(metric.value) }}</div>
          <div class="text-caption text_secondary">{{ metric.label }}</div>
        </div>
      </section>

      <q-tabs
        v-model="active_tab"
        dense
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="text_secondary coverage-tabs"
      >
        <q-tab name="overview" icon="monitoring" label="Overview" />
        <q-tab name="languages" icon="translate" label="Languages" />
        <q-tab name="sets" icon="inventory_2" label="Sets" />
        <q-tab name="missing" icon="error_outline" label="Missing" />
      </q-tabs>
      <q-separator dark />

      <q-tab-panels v-model="active_tab" animated class="bg-transparent text-white q-mt-md">
        <q-tab-panel name="overview" class="q-pa-none">
          <section class="overview-grid">
            <div>
              <h2 class="text-h6 q-mt-none q-mb-md">Image coverage</h2>
              <div v-for="row in overview_progress" :key="row.label" class="progress-row">
                <div class="progress-label">
                  <span>{{ row.label }}</span
                  ><strong>{{ row.percent.toFixed(1) }}%</strong>
                </div>
                <q-linear-progress
                  rounded
                  size="8px"
                  color="primary"
                  track-color="dark"
                  :value="row.percent / 100"
                  class="q-mt-sm"
                />
                <div class="text-caption text_secondary q-mt-xs">
                  {{ format_number(row.filled) }} of {{ format_number(row.total) }}
                </div>
              </div>
            </div>
            <div>
              <h2 class="text-h6 q-mt-none q-mb-md">Source contribution</h2>
              <div class="fact-row">
                <span>Matched fallback sets</span
                ><strong>{{ format_number(coverage.sources.matched_sets) }}</strong>
              </div>
              <div class="fact-row">
                <span>Matched fallback cards</span
                ><strong>{{ format_number(coverage.sources.matched_cards) }}</strong>
              </div>
              <div class="fact-row">
                <span>Metadata fields filled</span
                ><strong>{{ format_number(coverage.sources.metadata_fields_filled) }}</strong>
              </div>
              <div class="fact-row">
                <span>Tracked series</span
                ><strong>{{ format_number(Object.keys(coverage.series).length) }}</strong>
              </div>
            </div>
          </section>
        </q-tab-panel>

        <q-tab-panel name="languages" class="q-pa-none">
          <div class="data-table-wrap">
            <table class="coverage-table">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Filled</th>
                  <th>Missing</th>
                  <th>Total slots</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in language_rows" :key="row.id">
                  <td>{{ language_name(row.id) }}</td>
                  <td>{{ format_number(row.filled) }}</td>
                  <td>{{ format_number(row.missing) }}</td>
                  <td>{{ format_number(row.slots) }}</td>
                  <td class="coverage-cell">
                    <q-linear-progress
                      rounded
                      size="7px"
                      color="primary"
                      track-color="dark"
                      :value="row.percent / 100"
                    /><span>{{ row.percent.toFixed(1) }}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </q-tab-panel>

        <q-tab-panel name="sets" class="q-pa-none">
          <section class="filter-row q-mb-md">
            <q-input
              v-model="set_search"
              dark
              dense
              outlined
              clearable
              label="Find a set"
              class="set-search"
              ><template #prepend><q-icon name="search" /></template
            ></q-input>
            <q-select
              v-model="selected_region"
              :options="region_options"
              dark
              dense
              outlined
              emit-value
              map-options
              label="Region"
              class="region-select"
            />
            <q-checkbox v-model="missing_only" dark label="Missing assets only" />
          </section>
          <div class="text-caption text_secondary q-mb-sm">
            {{ format_number(filtered_sets.length) }} sets
          </div>
          <div class="data-table-wrap">
            <table class="coverage-table">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Series</th>
                  <th>Cards</th>
                  <th>No image</th>
                  <th>Logo</th>
                  <th>Symbol</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="set in filtered_sets" :key="set.id">
                  <td>
                    <router-link :to="`/set/${set.id}`" class="text-primary">{{
                      set.name
                    }}</router-link>
                    <div class="text-caption text_secondary">{{ set.id }}</div>
                  </td>
                  <td>{{ set.series_name }}</td>
                  <td>{{ format_number(set.cards) }}</td>
                  <td>{{ format_number(set.cards_without_image) }}</td>
                  <td>
                    <q-icon
                      :name="set.has_logo ? 'check_circle' : 'cancel'"
                      :color="set.has_logo ? 'positive' : 'negative'"
                    />
                  </td>
                  <td>
                    <q-icon
                      :name="set.has_symbol ? 'check_circle' : 'cancel'"
                      :color="set.has_symbol ? 'positive' : 'negative'"
                    />
                  </td>
                  <td>{{ set.image_coverage_percent.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </q-tab-panel>

        <q-tab-panel name="missing" class="q-pa-none">
          <section class="overview-grid">
            <div>
              <h2 class="text-h6 q-mt-none q-mb-md">Set artwork</h2>
              <div class="q-mb-lg">
                <div class="text-subtitle2">
                  Missing logos ({{ coverage.missing_set_assets.logo.length }})
                </div>
                <div class="id-list text_secondary q-mt-xs">
                  {{ coverage.missing_set_assets.logo.join(', ') }}
                </div>
              </div>
              <div class="q-mb-lg">
                <div class="text-subtitle2">
                  Missing symbols ({{ coverage.missing_set_assets.symbol.length }})
                </div>
                <div class="id-list text_secondary q-mt-xs">
                  {{ coverage.missing_set_assets.symbol.join(', ') }}
                </div>
              </div>
            </div>
            <div>
              <h2 class="text-h6 q-mt-none q-mb-md">Metadata</h2>
              <q-expansion-item
                v-for="(items, field) in coverage.missing_metadata"
                :key="field"
                dense
                switch-toggle-side
                :label="display_field(String(field))"
                :caption="`${format_number(items.length)} missing`"
                class="missing-set-row"
              >
                <div class="id-list q-pa-md">{{ items.join(', ') }}</div>
              </q-expansion-item>
            </div>
          </section>
          <h2 class="text-h6 q-mb-sm">Cards without any image</h2>
          <q-expansion-item
            v-for="set in sets_missing_cards"
            :key="set.id"
            dense
            switch-toggle-side
            :label="set.name"
            :caption="`${set.cards_without_image} missing · ${set.id}`"
            class="missing-set-row"
          >
            <div class="id-list q-pa-md">{{ set.missing_card_ids.join(', ') }}</div>
          </q-expansion-item>
          <h2 class="text-h6 q-mt-xl q-mb-sm">Missing localized image slots</h2>
          <q-expansion-item
            v-for="set in sets_missing_slots"
            :key="set.id"
            dense
            switch-toggle-side
            :label="set.name"
            :caption="`${missing_slot_count(set)} missing slots · ${set.id}`"
            class="missing-set-row"
          >
            <div
              v-for="(items, language) in set.missing_images"
              :key="language"
              class="q-pa-md localized-missing-row"
            >
              <div class="text-subtitle2">
                {{ language_name(String(language)) }} · {{ format_number(items.length) }}
              </div>
              <div class="id-list text_secondary q-mt-xs">{{ items.join(', ') }}</div>
            </div>
          </q-expansion-item>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import utils
  import { get_coverage, get_languages } from '../services/catalog_storage';

  // import types
  import type { Coverage_Counts, Set_Coverage } from '../models/catalog';

  /* const vars */
  const coverage = get_coverage();

  const number_formatter = new Intl.NumberFormat();

  const language_names = new Map(get_languages().map((language) => [language.id, language.name]));

  /* reactive vars */
  const active_tab = ref<string>('overview');

  const set_search = ref<string>('');

  const selected_region = ref<string>('all');

  const missing_only = ref<boolean>(false);

  /* computed vars */
  const generated_at = computed<string>(() =>
    coverage
      ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(coverage.generated_at),
        )
      : 'Never',
  );

  const summary_metrics = computed<{ label: string; value: number; icon: string }[]>(() =>
    coverage
      ? [
          { label: 'Cards', value: coverage.totals.cards, icon: 'style' },
          { label: 'Sets', value: coverage.totals.sets, icon: 'inventory_2' },
          {
            label: 'Cards missing scans',
            value: coverage.totals.cards_without_image,
            icon: 'image_not_supported',
          },
          {
            label: 'Missing image slots',
            value: coverage.totals.missing_image_slots,
            icon: 'broken_image',
          },
        ]
      : [],
  );

  const overview_progress = computed<
    { label: string; percent: number; filled: number; total: number }[]
  >(() =>
    coverage
      ? [
          {
            label: 'Cards with an image',
            percent: coverage.totals.card_image_coverage_percent,
            filled: coverage.totals.cards_with_image,
            total: coverage.totals.cards,
          },
          {
            label: 'Localized image slots',
            percent: coverage.totals.image_slot_coverage_percent,
            filled: coverage.totals.filled_image_slots,
            total: coverage.totals.image_slots,
          },
          {
            label: 'Set logos',
            percent: percent(coverage.totals.set_logos, coverage.totals.sets),
            filled: coverage.totals.set_logos,
            total: coverage.totals.sets,
          },
          {
            label: 'Set symbols',
            percent: percent(coverage.totals.set_symbols, coverage.totals.sets),
            filled: coverage.totals.set_symbols,
            total: coverage.totals.sets,
          },
        ]
      : [],
  );

  const language_rows = computed<
    { slots: number; filled: number; missing: number; percent: number; id: string }[]
  >(() =>
    coverage
      ? Object.entries(coverage.languages)
          .map(([id, counts]: [string, Coverage_Counts]) => ({ id, ...counts }))
          .sort((a, b) => a.percent - b.percent)
      : [],
  );

  const region_options = computed<{ label: string; value: string }[]>(() => [
    { label: 'All regions', value: 'all' },
    ...Array.from(new Set(coverage?.sets.map((set) => set.region_id) ?? []))
      .sort()
      .map((id) => ({ label: id, value: id })),
  ]);

  const filtered_sets = computed<Set_Coverage[]>(() => {
    const query = set_search.value.trim().toLocaleLowerCase();
    return (coverage?.sets ?? [])
      .filter((set) => selected_region.value === 'all' || set.region_id === selected_region.value)
      .filter(
        (set) =>
          !missing_only.value || set.cards_without_image > 0 || !set.has_logo || !set.has_symbol,
      )
      .filter(
        (set) =>
          !query || `${set.name} ${set.id} ${set.series_name}`.toLocaleLowerCase().includes(query),
      );
  });

  const sets_missing_cards = computed<Set_Coverage[]>(() =>
    (coverage?.sets ?? [])
      .filter((set) => set.cards_without_image > 0)
      .sort((a, b) => b.cards_without_image - a.cards_without_image),
  );

  const sets_missing_slots = computed<Set_Coverage[]>(() =>
    (coverage?.sets ?? [])
      .filter((set) => missing_slot_count(set) > 0)
      .sort((a, b) => missing_slot_count(b) - missing_slot_count(a)),
  );

  /* functions */
  const format_number = (value: number | undefined): string => number_formatter.format(value ?? 0);

  const percent = (filled: number, total: number): number => (total ? (filled * 100) / total : 100);

  const language_name = (id: string): string => language_names.get(id) ?? id;

  const display_field = (field: string): string =>
    field.replaceAll('_', ' ').replace(/^./, (value) => value.toUpperCase());

  const reload_page = (): void => window.location.reload();

  const missing_slot_count = (set: Set_Coverage): number =>
    Object.values(set.missing_images).reduce((total, items) => total + items.length, 0);
</script>

<style scoped>
  .coverage-header,
  .filter-row,
  .progress-label,
  .fact-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--app_border);
  }
  .metric-block {
    padding: 20px 16px;
    border-right: 1px solid var(--app_border);
  }
  .metric-block:last-child {
    border-right: 0;
  }
  .coverage-tabs {
    min-height: 44px;
  }
  .overview-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
    gap: 40px;
  }
  .progress-row {
    margin-bottom: 22px;
  }
  .fact-row {
    min-height: 42px;
    border-bottom: 1px solid var(--app_border);
  }
  .data-table-wrap {
    overflow-x: auto;
  }
  .coverage-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .coverage-table th,
  .coverage-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--app_border);
    text-align: left;
    vertical-align: middle;
  }
  .coverage-table th {
    color: var(--app_text_muted);
    font-size: 12px;
    text-transform: uppercase;
  }
  .coverage-cell {
    display: grid;
    grid-template-columns: minmax(100px, 1fr) 56px;
    align-items: center;
    gap: 10px;
    min-width: 190px;
  }
  .set-search {
    width: min(360px, 100%);
  }
  .region-select {
    width: 180px;
  }
  .missing-set-row,
  .localized-missing-row {
    border-bottom: 1px solid var(--app_border);
  }
  .id-list {
    overflow-wrap: anywhere;
    line-height: 1.7;
  }
  @media (max-width: 800px) {
    .metric-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .metric-block:nth-child(2) {
      border-right: 0;
    }
    .overview-grid {
      grid-template-columns: 1fr;
    }
    .filter-row {
      align-items: stretch;
      flex-direction: column;
    }
    .set-search,
    .region-select {
      width: 100%;
    }
  }
</style>
