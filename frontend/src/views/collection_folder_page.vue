<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section class="q-mb-lg">
      <q-btn
        flat
        dense
        color="secondary"
        icon="arrow_back"
        label="Collection dashboard"
        no-caps
        to="/collection"
        ><q-tooltip :delay="1000">Collection dashboard</q-tooltip></q-btn
      >
      <div class="text-overline text-primary q-mt-sm">Collection folder</div>
      <h1 class="text-h4 text-weight-bold q-my-none">{{ folder?.name ?? 'Unknown folder' }}</h1>
      <div class="text-body2 text_secondary">
        {{ card_count }} owned cards · {{ wanted_count }} wanted · Estimated collection value
        {{ format_euro_price(folder_value) }}
      </div>
      <div class="text-caption text_secondary q-mt-xs">
        Catalog cards use current Cardmarket trend prices; manual cards use their entered estimated
        value.
      </div>
    </section>

    <q-tabs
      v-if="folder"
      v-model="collection_tab"
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="q-mb-md"
    >
      <q-tab name="owned" :label="`Owned (${card_count})`" />
      <q-tab name="wanted" :label="`Wanted (${wanted_count})`" />
    </q-tabs>

    <section v-if="folder" class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-input
          v-model="search"
          dark
          dense
          outlined
          clearable
          debounce="150"
          label="Search cards by name"
          @clear="search = ''"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="selected_language_id"
          :options="language_options"
          emit-value
          map-options
          dark
          dense
          outlined
          clearable
          label="Language"
        />
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <card-sort-selector v-model="selected_sort" />
      </div>
      <div v-if="folder.pokedex_config && collection_tab === 'owned'" class="col-12 col-md-auto">
        <q-toggle
          :model-value="only_non_fitting"
          color="primary"
          label="Only non-fitting cards"
          @update:model-value="set_only_non_fitting"
        />
        <q-toggle
          :model-value="only_duplicates"
          color="primary"
          label="Only duplicate cards"
          @update:model-value="set_only_duplicates"
        />
      </div>
      <div v-if="folder.pokedex_config && collection_tab === 'wanted'" class="col-12 col-md-auto">
        <q-toggle v-model="only_available_wanted" color="primary" label="Only existing cards" />
      </div>
      <div class="col-12 col-md-auto">
        <q-btn
          color="primary"
          text-color="dark"
          icon="add_photo_alternate"
          label="Add manual card"
          no-caps
          @click="show_manual_card_dialog = true"
          ><q-tooltip :delay="1000">Add manual card</q-tooltip></q-btn
        >
      </div>
      <div class="col-12 col-md-auto">
        <q-btn
          v-if="folder.type === 'binder'"
          outline
          color="primary"
          icon="auto_stories"
          :label="binder_store.get(folder_id) ? 'Open binder' : 'Create binder'"
          no-caps
          :to="`/collection/folder/${folder_id}/binder`"
          ><q-tooltip :delay="1000">{{
            binder_store.get(folder_id) ? 'Open binder' : 'Create binder'
          }}</q-tooltip></q-btn
        >
      </div>
      <div v-if="folder.pokedex_config" class="col-12 col-md-auto">
        <q-btn
          outline
          color="primary"
          icon="filter_alt"
          label="Pokédex options"
          no-caps
          @click="pokedex_dialog?.open()"
          ><q-tooltip :delay="1000">Pokédex options</q-tooltip></q-btn
        >
      </div>
      <div v-if="collection_tab === 'wanted'" class="col-12 col-md-auto">
        <q-btn
          outline
          color="secondary"
          icon="picture_as_pdf"
          label="Print placeholder"
          no-caps
          :loading="generating_placeholders"
          :disable="wanted_rows.length === 0"
          @click="print_wanted_placeholders"
          ><q-tooltip :delay="1000">Print placeholder</q-tooltip></q-btn
        >
      </div>
      <div class="col-12 col-md-auto">
        <q-btn
          :outline="!selection_mode"
          color="primary"
          icon="checklist"
          :label="selection_mode ? 'Cancel selection' : 'Select cards'"
          no-caps
          @click="toggle_selection_mode"
          ><q-tooltip :delay="1000">{{
            selection_mode ? 'Cancel selection' : 'Select cards'
          }}</q-tooltip></q-btn
        >
      </div>
    </section>

    <q-banner v-if="placeholder_error" class="status_error text-negative q-mb-md rounded-borders">
      {{ placeholder_error }}
    </q-banner>

    <section v-if="folder && selection_mode" class="row items-center q-gutter-sm q-mb-md">
      <q-checkbox
        :model-value="all_displayed_selected"
        :indeterminate="some_displayed_selected && !all_displayed_selected"
        dark
        color="primary"
        :label="`Select all visible (${displayed_rows.length})`"
        @update:model-value="toggle_select_all_displayed"
      />
      <q-space />
      <span class="text-body2 text_secondary">{{ selected_entry_ids.size }} selected</span>
      <q-btn
        outline
        color="negative"
        icon="delete"
        label="Delete selected"
        no-caps
        :disable="selected_entry_ids.size === 0"
        @click="show_bulk_delete_dialog = true"
        ><q-tooltip :delay="1000">Delete selected</q-tooltip></q-btn
      >
      <q-btn
        outline
        color="primary"
        icon="edit"
        label="Edit selected"
        no-caps
        :disable="selected_entry_ids.size === 0"
        @click="bulk_editor?.open()"
        ><q-tooltip :delay="1000">Edit selected</q-tooltip></q-btn
      >
      <q-btn
        color="primary"
        text-color="dark"
        icon="drive_file_move"
        label="Move to collection"
        no-caps
        :disable="selected_entry_ids.size === 0 || destination_folders.length === 0"
        @click="transfer_dialog?.open()"
        ><q-tooltip :delay="1000">Move to collection</q-tooltip></q-btn
      >
    </section>

    <q-banner v-if="!folder" class="app_surface text_secondary">
      This collection folder does not exist.
    </q-banner>

    <q-banner v-else-if="active_rows.length === 0" class="app_surface text_secondary">
      <template v-if="collection_tab === 'wanted'">
        This want list is empty. Use the heart button on a card to add it.
      </template>
      <template v-else>
        This folder has no owned cards. Add cards from a set, search result, or card detail page.
      </template>
    </q-banner>

    <q-banner v-else-if="filtered_rows.length === 0" class="app_surface text_secondary">
      No card matches these filters.
    </q-banner>

    <card-list
      v-else
      :cards="displayed_rows.map((row) => row.card)"
      :collection_entries="displayed_rows.map((row) => row.entry)"
      :selectable="selection_mode"
      :selected_entry_ids="[...selected_entry_ids]"
      :protected_entry_ids="
        displayed_rows
          .filter((row) => row.entry.wanted && row.entry.pokedex_requirement_id)
          .map((row) => row.entry.id)
      "
      :status_overlays="
        Object.fromEntries(
          displayed_rows.flatMap((row) => {
            const status = collection_store.pokedex_entry_status(row.entry.id);
            return status ? [[row.entry.id, status]] : [];
          }),
        )
      "
      @card-click="open_card"
      @edit-entry="open_edit_entry_by_id"
      @delete-entry="set_entry_to_delete"
      @toggle-selection="toggle_entry_selection"
    />

    <div
      v-if="displayed_rows.length < filtered_rows.length"
      class="row justify-center q-mt-xl q-pb-md"
    >
      <q-btn
        color="primary"
        text-color="dark"
        unelevated
        :label="`Show more (${filtered_rows.length - displayed_rows.length} remaining)`"
        no-caps
        @click="visible_row_count += collection_row_step"
        ><q-tooltip :delay="1000">{{
          `Show more (${filtered_rows.length - displayed_rows.length} remaining)`
        }}</q-tooltip></q-btn
      >
    </div>

    <back-to-top-button />

    <q-dialog v-model="show_pokedex_candidates">
      <q-card
        class="app_surface text-white"
        style="width: 1200px; max-width: 96vw; max-height: 92vh"
      >
        <q-card-section class="row items-center">
          <div>
            <div class="text-h6">Possible cards</div>
            <div class="text-body2 text_secondary">
              {{ selected_pokedex_placeholder?.display_name }}
            </div>
          </div>
          <q-space />
          <q-btn
            v-close-popup
            flat
            round
            dense
            icon="close"
            color="secondary"
            no-caps
            aria-label="Close card candidates"
            ><q-tooltip :delay="1000">close</q-tooltip></q-btn
          >
        </q-card-section>
        <q-separator dark />
        <q-card-section class="scroll" style="max-height: calc(92vh - 90px)">
          <card-list :cards="selected_pokedex_candidates" @card-click="open_pokedex_candidate" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <collection-transfer-dialog
      ref="transfer_dialog"
      :rows="selected_transfer_rows"
      :destination_folders="destination_folders"
      @saved="clear_selection"
    />

    <collection-bulk-edit-dialog
      ref="bulk_editor"
      :entry_ids="[...selected_entry_ids]"
      @saved="clear_selection"
    />

    <collection-entry-dialog ref="entry_editor" />

    <q-dialog
      :model-value="entry_to_delete !== null"
      @update:model-value="
        (value) => {
          if (!value) entry_to_delete = null;
        }
      "
    >
      <q-card class="app_surface text-white">
        <q-card-section>
          <div class="text-h6">Remove this card?</div>
          <div class="text-body2 text_secondary q-mt-sm">
            <template v-if="entry_to_delete?.entry.wanted">
              Remove {{ entry_to_delete.card.display_name }} from this want list?
            </template>
            <template v-else>
              Remove {{ entry_to_delete?.entry.quantity }} ×
              {{ entry_to_delete?.card.display_name }} ({{ entry_to_delete?.entry.condition }}) from
              this folder?
            </template>
          </div>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn flat color="secondary" label="Cancel" no-caps @click="entry_to_delete = null"
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn color="negative" label="Remove card" no-caps @click="confirm_remove_entry"
            ><q-tooltip :delay="1000">Remove card</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="show_bulk_delete_dialog">
      <q-card class="app_surface text-white" style="width: 440px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">Delete selected cards?</div>
          <div class="text-body2 text_secondary q-mt-sm">
            This will remove all copies of the {{ selected_entry_ids.size }} selected
            {{ selected_entry_ids.size === 1 ? 'entry' : 'entries' }} from this collection.
          </div>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="negative"
            icon="delete"
            label="Delete selected"
            no-caps
            @click="confirm_bulk_delete"
            ><q-tooltip :delay="1000">Delete selected</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <collection-pokedex-dialog ref="pokedex_dialog" :folder_id="folder_id" />

    <manual-card-dialog v-model="show_manual_card_dialog" :initial_folder_id="folder_id" />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { useRoute, useRouter } from 'vue-router';
  import { computed, ref, watch } from 'vue';

  // import components
  import CollectionBulkEditDialog from '../components/collection/collection_bulk_edit_dialog.vue';
  import CollectionTransferDialog from '../components/collection/collection_transfer_dialog.vue';
  import CollectionPokedexDialog from '../components/collection/collection_pokedex_dialog.vue';
  import CollectionEntryDialog from '../components/collection/collection_entry_dialog.vue';
  import ManualCardDialog from '../components/manual_card_dialog.vue';
  import CardSortSelector from '../components/card_sort_selector.vue';
  import BackToTopButton from '../components/back_to_top_button.vue';
  import CardList from '../components/card_list.vue';

  // import utils
  import { download_wanted_placeholders_pdf } from '../utils/wanted_placeholders_pdf';
  import { collection_store } from '../store/modules/collection';
  import { format_euro_price } from '../utils/card_display';
  import { resolve_card_image } from '../utils/card_images';
  import { binder_store } from '../store/modules/binders';
  import { localized_value } from '../utils/localization';
  import {
    get_card_by_id,
    get_languages,
    get_pokemon,
    get_set_by_id,
  } from '../services/catalog_storage';
  import { store } from '../store/index';
  import {
    build_display_card,
    cardmarket_display_price,
    compare_card_release_and_number,
  } from '../utils/card_display';
  import {
    pokedex_candidates_by_target,
    pokedex_placeholder_card,
    pokemon_id_from_requirement,
  } from '../utils/pokedex_binder';

  // import types
  import type { Collection_Entry, Collection_Folder } from '../store/modules/collection';
  import type { Collection_Row } from '../models/collection_view';
  import type { Collection_Folder_Filters } from '../store/index';
  import type { Display_Card } from '../utils/card_display';
  import type { Card_Sort } from '../utils/card_sorting';

  /* hooks */
  const route = useRoute();

  const router = useRouter();

  /* const vars */
  const initial_folder_id = String(route.params.folderId ?? '');

  const stored_filters = store.state.collection_folder_filters[initial_folder_id];

  const collection_row_step = 48;

  const language_names = new Map(get_languages().map((language) => [language.id, language.name]));

  const pokemon = get_pokemon();

  const pokedex_by_pokemon_id = new Map(pokemon.map((entry) => [entry.id, entry.pokedex_id]));

  const pokedex_by_pokemon_name = new Map(
    pokemon.flatMap((entry) =>
      [
        entry.name,
        ...Object.values(entry.names).filter((name): name is string => Boolean(name)),
      ].map((name) => [name.toLocaleLowerCase(), entry.pokedex_id] as const),
    ),
  );

  /* reactive vars */
  const entry_editor = ref<InstanceType<typeof CollectionEntryDialog> | null>(null);

  const transfer_dialog = ref<InstanceType<typeof CollectionTransferDialog> | null>(null);

  const bulk_editor = ref<InstanceType<typeof CollectionBulkEditDialog> | null>(null);

  const pokedex_dialog = ref<InstanceType<typeof CollectionPokedexDialog> | null>(null);

  const search = ref<string>(stored_filters?.search ?? '');

  const collection_tab = ref<'owned' | 'wanted'>(stored_filters?.tab ?? 'owned');

  const selected_language_id = ref<string | null>(stored_filters?.language_id ?? null);

  const only_non_fitting = ref<boolean>(stored_filters?.only_non_fitting ?? false);

  const only_duplicates = ref<boolean>(stored_filters?.only_duplicates ?? false);

  const only_available_wanted = ref<boolean>(stored_filters?.only_available_wanted ?? false);

  const selected_sort = ref<Card_Sort>(stored_filters?.sort ?? 'release-desc');

  const visible_row_count = ref<number>(collection_row_step);

  const selection_mode = ref<boolean>(false);

  const selected_entry_ids = ref<Set<string>>(new Set<string>());

  const show_bulk_delete_dialog = ref<boolean>(false);

  const entry_to_delete = ref<Collection_Row | null>(null);

  const show_manual_card_dialog = ref<boolean>(false);

  const show_pokedex_candidates = ref<boolean>(false);

  const selected_pokedex_placeholder = ref<Display_Card | null>(null);

  const generating_placeholders = ref<boolean>(false);

  const placeholder_error = ref<string | null>(null);

  /* computed vars */
  const folder_id = computed<string>(() => String(route.params.folderId ?? ''));

  const folder = computed<Collection_Folder | null>(
    () =>
      collection_store.folders.value.find((candidate) => candidate.id === folder_id.value) ?? null,
  );

  const selected_pokedex_candidates = computed<Display_Card[]>(() => {
    const config = folder.value?.pokedex_config;
    const placeholder = selected_pokedex_placeholder.value;
    if (!config || !placeholder || placeholder.set_id !== 'pokedex-requirement') return [];
    const pokemon_id = pokemon_id_from_requirement(placeholder.id);
    return (pokedex_candidates_by_target(config).get(pokemon_id) ?? []).flatMap((candidate) => {
      const card = get_card_by_id(candidate.set_id, candidate.card_id);
      const set = get_set_by_id(candidate.set_id);
      const variant = card?.variants.find((item) => item.id === candidate.variant_id);
      if (!card || !variant) return [];
      const set_name = set ? (localized_value(set.name, candidate.language_id) ?? set.id) : null;
      return [build_display_card(card, variant, candidate.language_id, set_name)];
    });
  });

  const destination_folders = computed<Collection_Folder[]>(() =>
    collection_store.folders.value.filter((candidate) => candidate.id !== folder_id.value),
  );

  const collection_rows = computed<Collection_Row[]>(() =>
    collection_store.entries.value
      .filter((entry) => entry.folder_id === folder_id.value)
      .flatMap((entry): Collection_Row[] => {
        if (entry.set_id === 'pokedex-requirement' && entry.pokedex_requirement_id) {
          const card = pokedex_placeholder_card(
            entry.pokedex_requirement_id,
            entry.pokedex_candidate_count ?? 0,
            folder.value?.pokedex_config?.international_language_id ?? 'en',
            folder.value?.pokedex_config,
          );
          return card
            ? [
                {
                  entry,
                  card,
                  release_date: null,
                  pokedex_number: Number(card.number),
                  unit_price: null,
                  total_value: 0,
                },
              ]
            : [];
        }
        if (entry.set_id === 'manual-collection') {
          const manual_card = collection_store.manual_cards.value.find(
            (candidate) => candidate.id === entry.card_id,
          );
          if (!manual_card) return [];
          const image = resolve_card_image({}, entry.language_id, entry.language_id, {
            set_id: 'manual-collection',
            card_id: manual_card.id,
            variant_id: entry.variant_id,
          });
          return [
            {
              entry,
              card: {
                id: manual_card.id,
                card_id: manual_card.id,
                set_id: 'manual-collection',
                set_name: manual_card.set_name || null,
                language_id: entry.language_id,
                variant_id: entry.variant_id,
                number: manual_card.number || '?',
                display_name: manual_card.name,
                category: manual_card.category,
                rarity: manual_card.rarity,
                hp: manual_card.hp,
                illustrator: manual_card.illustrator || null,
                types: manual_card.types,
                pokemon_names: manual_card.pokemon_name ? [manual_card.pokemon_name] : [],
                energy_costs: [],
                image_url: image.url,
                image_language_id: image.language_id,
                image_is_fallback: false,
                image_source: image.source,
                cardmarket: null,
                is_manual: true,
                estimated_value: manual_card.estimated_value,
              },
              release_date: manual_card.release_date,
              pokedex_number: manual_card.pokemon_name
                ? (pokedex_by_pokemon_name.get(manual_card.pokemon_name.toLocaleLowerCase()) ??
                  null)
                : null,
              unit_price: manual_card.estimated_value,
              total_value: (manual_card.estimated_value ?? 0) * entry.quantity,
            },
          ];
        }
        const card = get_card_by_id(entry.set_id, entry.card_id);
        const set = get_set_by_id(entry.set_id);
        const variant = card?.variants.find((candidate) => candidate.id === entry.variant_id);
        if (!card || !variant) return [];
        const language_id = entry.language_id;
        const set_name = set ? (localized_value(set.name, language_id) ?? set.id) : null;
        const display_card = build_display_card(card, variant, language_id, set_name);
        const unit_price = cardmarket_display_price(variant.cardmarket);
        const pokedex_numbers = (card.pokemon ?? [])
          .map((pokemon_id) => pokedex_by_pokemon_id.get(pokemon_id))
          .filter((number): number is number => number !== undefined);
        return [
          {
            entry,
            card: display_card,
            release_date: set?.release_date ?? null,
            pokedex_number: pokedex_numbers.length ? Math.min(...pokedex_numbers) : null,
            unit_price: unit_price,
            total_value: (unit_price ?? 0) * entry.quantity,
          },
        ];
      }),
  );

  const active_rows = computed<Collection_Row[]>(() =>
    collection_rows.value.filter((row) => row.entry.wanted === (collection_tab.value === 'wanted')),
  );

  const selected_transfer_rows = computed<Collection_Row[]>(() =>
    collection_rows.value.filter((row) => selected_entry_ids.value.has(row.entry.id)),
  );

  const wanted_rows = computed<Collection_Row[]>(() =>
    collection_rows.value.filter((row) => row.entry.wanted),
  );

  const language_options = computed<{ label: string; value: string }[]>(() =>
    [...new Set(active_rows.value.map((row) => row.entry.language_id))]
      .map((language_id) => ({
        label: language_names.get(language_id) ?? language_id.toUpperCase(),
        value: language_id,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  );

  const filtered_rows = computed<Collection_Row[]>(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return active_rows.value
      .filter((row) => query === '' || row.card.display_name.toLocaleLowerCase().includes(query))
      .filter(
        (row) =>
          !selected_language_id.value || row.entry.language_id === selected_language_id.value,
      )
      .filter(
        (row) =>
          !only_non_fitting.value ||
          !folder.value?.pokedex_config ||
          collection_tab.value !== 'owned' ||
          collection_store.pokedex_entry_status(row.entry.id) ===
            'This card no longer fits this binder',
      )
      .filter(
        (row) =>
          !only_duplicates.value ||
          !folder.value?.pokedex_config ||
          collection_tab.value !== 'owned' ||
          collection_store.pokedex_entry_status(row.entry.id) === 'Duplicate in this binder',
      )
      .filter(
        (row) =>
          !only_available_wanted.value ||
          !folder.value?.pokedex_config ||
          collection_tab.value !== 'wanted' ||
          row.entry.set_id !== 'pokedex-requirement' ||
          (row.entry.pokedex_candidate_count ?? 0) > 0,
      )
      .sort((left, right) => {
        if (selected_sort.value === 'price-asc' || selected_sort.value === 'price-desc') {
          if (left.unit_price === null && right.unit_price !== null) return 1;
          if (left.unit_price !== null && right.unit_price === null) return -1;
          if (
            left.unit_price !== null &&
            right.unit_price !== null &&
            left.unit_price !== right.unit_price
          ) {
            return selected_sort.value === 'price-asc'
              ? left.unit_price - right.unit_price
              : right.unit_price - left.unit_price;
          }
        }
        if (selected_sort.value === 'release-desc' || selected_sort.value === 'release-asc') {
          const comparison = compare_card_release_and_number(
            left.release_date,
            right.release_date,
            left.card.number,
            right.card.number,
            selected_sort.value === 'release-asc' ? 'asc' : 'desc',
          );
          if (comparison !== 0) return comparison;
        }
        if (selected_sort.value === 'pokedex-asc' || selected_sort.value === 'pokedex-desc') {
          if (left.pokedex_number === null && right.pokedex_number !== null) return 1;
          if (left.pokedex_number !== null && right.pokedex_number === null) return -1;
          if (
            left.pokedex_number !== null &&
            right.pokedex_number !== null &&
            left.pokedex_number !== right.pokedex_number
          ) {
            return selected_sort.value === 'pokedex-asc'
              ? left.pokedex_number - right.pokedex_number
              : right.pokedex_number - left.pokedex_number;
          }
        }
        return left.card.display_name.localeCompare(right.card.display_name);
      });
  });

  const displayed_rows = computed<Collection_Row[]>(() =>
    filtered_rows.value.slice(0, visible_row_count.value),
  );

  const card_count = computed<number>(() =>
    collection_rows.value
      .filter((row) => !row.entry.wanted)
      .reduce((total, row) => total + row.entry.quantity, 0),
  );

  const wanted_count = computed<number>(() =>
    collection_rows.value
      .filter((row) => row.entry.wanted)
      .reduce((total, row) => total + row.entry.quantity, 0),
  );

  const folder_value = computed<number>(() =>
    collection_rows.value
      .filter((row) => !row.entry.wanted)
      .reduce((total, row) => total + row.total_value, 0),
  );

  const displayed_entry_ids = computed<string[]>(() =>
    displayed_rows.value
      .filter((row) => !row.entry.pokedex_requirement_id || !row.entry.wanted)
      .map((row) => row.entry.id),
  );

  const all_displayed_selected = computed<boolean>(
    () =>
      displayed_entry_ids.value.length > 0 &&
      displayed_entry_ids.value.every((entry_id) => selected_entry_ids.value.has(entry_id)),
  );

  const some_displayed_selected = computed<boolean>(() =>
    displayed_entry_ids.value.some((entry_id) => selected_entry_ids.value.has(entry_id)),
  );

  /* functions */
  const clear_selection = (): void => {
    selected_entry_ids.value = new Set();
    selection_mode.value = false;
  };

  const set_only_non_fitting = (enabled: boolean): void => {
    only_non_fitting.value = enabled;
    if (enabled) only_duplicates.value = false;
  };

  const set_only_duplicates = (enabled: boolean): void => {
    only_duplicates.value = enabled;
    if (enabled) only_non_fitting.value = false;
  };

  const toggle_selection_mode = (): void => {
    selection_mode.value = !selection_mode.value;
    if (!selection_mode.value) selected_entry_ids.value = new Set();
  };

  const toggle_entry_selection = (entry: Collection_Entry): void => {
    if (entry.wanted && entry.pokedex_requirement_id) return;
    const next = new Set(selected_entry_ids.value);
    if (next.has(entry.id)) next.delete(entry.id);
    else next.add(entry.id);
    selected_entry_ids.value = next;
  };

  const toggle_select_all_displayed = (): void => {
    const next = new Set(selected_entry_ids.value);
    if (all_displayed_selected.value) {
      displayed_entry_ids.value.forEach((entry_id) => next.delete(entry_id));
    } else {
      displayed_entry_ids.value.forEach((entry_id) => next.add(entry_id));
    }
    selected_entry_ids.value = next;
  };

  const confirm_bulk_delete = (): void => {
    for (const entry_id of selected_entry_ids.value) {
      collection_store.remove_entry(entry_id);
    }
    selected_entry_ids.value = new Set();
    selection_mode.value = false;
    show_bulk_delete_dialog.value = false;
  };

  const open_edit_entry_by_id = (entry: Collection_Entry): void => {
    const row = collection_rows.value.find((candidate) => candidate.entry.id === entry.id);
    if (row) entry_editor.value?.open(row);
  };

  const set_entry_to_delete = (entry: Collection_Entry): void => {
    entry_to_delete.value =
      collection_rows.value.find((candidate) => candidate.entry.id === entry.id) ?? null;
  };

  const open_card = (card: Display_Card): void => {
    if (card.set_id === 'pokedex-requirement') {
      if (card.variant_id !== 'multiple') return;
      selected_pokedex_placeholder.value = card;
      show_pokedex_candidates.value = true;
      return;
    }
    if (card.is_manual) {
      const row = collection_rows.value.find(
        (candidate) => candidate.entry.card_id === card.card_id,
      );
      if (row) entry_editor.value?.open(row);
      return;
    }
    void router.push({
      path: `/set/${card.set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id, from: 'collection', folder: folder_id.value },
    });
  };

  const open_pokedex_candidate = (card: Display_Card): void => {
    show_pokedex_candidates.value = false;
    void router.push({
      path: `/set/${card.set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id, from: 'collection', folder: folder_id.value },
    });
  };

  const confirm_remove_entry = (): void => {
    if (entry_to_delete.value) collection_store.remove_entry(entry_to_delete.value.entry.id);
    entry_to_delete.value = null;
  };

  const print_wanted_placeholders = async (): Promise<void> => {
    if (!folder.value || wanted_rows.value.length === 0) return;
    generating_placeholders.value = true;
    placeholder_error.value = null;
    return download_wanted_placeholders_pdf(
      folder.value.name,
      wanted_rows.value.map((row) => ({ card: row.card, quantity: row.entry.quantity })),
    )
      .catch((err) => {
        placeholder_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        generating_placeholders.value = false;
      });
  };

  /* watchers */
  watch(collection_tab, () => {
    selected_entry_ids.value = new Set();
    selected_language_id.value = null;
    only_non_fitting.value = false;
    only_duplicates.value = false;
    visible_row_count.value = collection_row_step;
  });

  watch(
    [
      search,
      selected_language_id,
      only_non_fitting,
      only_duplicates,
      only_available_wanted,
      selected_sort,
    ],
    () => {
      visible_row_count.value = collection_row_step;
    },
  );

  watch(
    [
      folder_id,
      search,
      collection_tab,
      selected_language_id,
      only_non_fitting,
      only_duplicates,
      only_available_wanted,
      selected_sort,
    ],
    () => {
      store.commit('set_collection_folder_filters', {
        folder_id: folder_id.value,
        filters: {
          search: search.value,
          tab: collection_tab.value,
          language_id: selected_language_id.value,
          only_non_fitting: only_non_fitting.value,
          only_duplicates: only_duplicates.value,
          only_available_wanted: only_available_wanted.value,
          sort: selected_sort.value,
        } satisfies Collection_Folder_Filters,
      });
    },
    { immediate: true },
  );
</script>
