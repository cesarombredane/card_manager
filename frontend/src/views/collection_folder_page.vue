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
          @click="open_pokedex_options"
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
        @click="open_bulk_edit_dialog"
        ><q-tooltip :delay="1000">Edit selected</q-tooltip></q-btn
      >
      <q-btn
        color="primary"
        text-color="dark"
        icon="drive_file_move"
        label="Move to collection"
        no-caps
        :disable="selected_entry_ids.size === 0 || destination_folders.length === 0"
        @click="open_transfer_dialog"
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
            aria-label="close"
            ><q-tooltip :delay="1000">close</q-tooltip></q-btn
          >
        </q-card-section>
        <q-separator dark />
        <q-card-section class="scroll" style="max-height: calc(92vh - 90px)">
          <card-list :cards="selected_pokedex_candidates" @card-click="open_pokedex_candidate" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="show_transfer_dialog">
      <q-card class="app_surface text-white" style="width: 480px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">Move selected cards</div>
          <div class="text-body2 text_secondary">
            Move {{ selected_entry_ids.size }} selected
            {{ selected_entry_ids.size === 1 ? 'entry' : 'entries' }} to another collection.
          </div>
        </q-card-section>
        <q-card-section>
          <collection-folder-select
            v-model="transfer_folder_id"
            :folders="destination_folders"
            dark
            outlined
            label="Destination collection"
          />
          <q-list v-if="selected_transfer_rows.length > 0" class="q-mt-md" separator>
            <q-item v-for="row in selected_transfer_rows" :key="row.entry.id" class="q-px-none">
              <q-item-section>
                <q-item-label>{{ row.card.display_name }}</q-item-label>
                <q-item-label caption class="text_secondary">
                  {{ row.entry.language_id.toUpperCase() }} · {{ row.entry.condition }}
                </q-item-label>
                <q-select
                  v-if="transfer_pokedex_options(row).length > 1"
                  v-model="transfer_pokedex_requirements[row.entry.id]"
                  :options="transfer_pokedex_options(row)"
                  emit-value
                  map-options
                  dark
                  dense
                  outlined
                  class="q-mt-sm"
                  label="Pokédex slot"
                />
              </q-item-section>
              <q-item-section side>
                <div v-if="row.entry.quantity > 1" class="row items-center no-wrap q-gutter-xs">
                  <q-btn
                    flat
                    round
                    dense
                    icon="remove"
                    color="secondary"
                    :disable="transfer_quantities[row.entry.id] <= 1"
                    aria-label="Move one fewer copy"
                    no-caps
                    @click="change_transfer_quantity(row.entry.id, -1, row.entry.quantity)"
                    ><q-tooltip :delay="1000">remove</q-tooltip></q-btn
                  >
                  <span class="text-body1 text-center" style="min-width: 24px">
                    {{ transfer_quantities[row.entry.id] }}
                  </span>
                  <q-btn
                    flat
                    round
                    dense
                    icon="add"
                    color="primary"
                    :disable="transfer_quantities[row.entry.id] >= row.entry.quantity"
                    aria-label="Move one more copy"
                    no-caps
                    @click="change_transfer_quantity(row.entry.id, 1, row.entry.quantity)"
                    ><q-tooltip :delay="1000">add</q-tooltip></q-btn
                  >
                </div>
                <span v-else class="text-caption text_secondary">1 copy</span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="primary"
            text-color="dark"
            label="Move cards"
            :disable="!transfer_folder_id || missing_transfer_pokedex_choices"
            no-caps
            @click="confirm_bulk_transfer"
            ><q-tooltip :delay="1000">Move cards</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="show_bulk_edit_dialog">
      <q-card class="app_surface text-white" style="width: 480px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">Edit selected cards</div>
          <div class="text-body2 text_secondary">
            Change the language of {{ selected_entry_ids.size }} selected
            {{ selected_entry_ids.size === 1 ? 'entry' : 'entries' }}.
          </div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="bulk_edit_language_id"
            :options="all_language_options"
            emit-value
            map-options
            dark
            outlined
            label="Language"
          />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="primary"
            text-color="dark"
            label="Apply changes"
            :disable="!bulk_edit_language_id"
            no-caps
            @click="confirm_bulk_edit"
            ><q-tooltip :delay="1000">Apply changes</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="show_edit_dialog">
      <q-card class="app_surface text-white" style="width: 720px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">
            {{ editing_entry?.entry.wanted ? 'Edit wanted card' : 'Edit collection card' }}
          </div>
          <div class="text-body2 text_secondary">{{ editing_entry?.card.display_name }}</div>
        </q-card-section>
        <q-card-section class="row q-col-gutter-md q-row-gutter-md">
          <template v-if="editing_manual_card">
            <div class="col-12">
              <q-input v-model="edit_manual_name" dark outlined label="Card name *" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="edit_manual_set_name" dark outlined label="Set name" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="edit_manual_number" dark outlined label="Set number" />
            </div>
            <div class="col-12 col-sm-6">
              <q-select
                v-model="edit_manual_category"
                :options="category_options"
                dark
                outlined
                label="Category"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="edit_manual_rarity" dark outlined label="Rarity" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="edit_manual_pokemon_name" dark outlined label="Pokémon name" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="edit_manual_hp"
                type="number"
                min="1"
                dark
                outlined
                label="HP"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="edit_manual_types" dark outlined label="Types (comma-separated)" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="edit_manual_illustrator" dark outlined label="Illustrator" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="edit_manual_value"
                type="number"
                min="0"
                step="0.01"
                dark
                outlined
                label="Estimated value (€)"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="edit_manual_release_date"
                mask="##-##-####"
                dark
                outlined
                label="Release date"
                hint="DD-MM-YYYY"
              />
            </div>
            <div class="col-12">
              <q-input v-model="edit_manual_notes" type="textarea" dark outlined label="Notes" />
            </div>
            <div class="col-12">
              <q-file
                v-model="edit_manual_image_file"
                dark
                outlined
                accept="image/jpeg,image/png,image/webp"
                label="Replace or add image"
                @update:model-value="prepare_edit_manual_image"
              >
                <template #prepend><q-icon name="image" /></template>
              </q-file>
            </div>
            <div v-if="edit_manual_image_preview" class="col-12">
              <q-img
                :src="edit_manual_image_preview"
                fit="contain"
                class="app_surface rounded-borders"
                style="max-height: 400px"
              />
            </div>
            <div v-if="edit_save_error" class="col-12 text-negative">{{ edit_save_error }}</div>
          </template>
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="edit_quantity"
              type="number"
              min="1"
              step="1"
              dark
              outlined
              label="Quantity"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              v-model="edit_language_id"
              :options="edit_language_options"
              emit-value
              map-options
              dark
              outlined
              label="Language"
            />
          </div>
          <div v-if="editing_manual_card" class="col-12 col-sm-6">
            <q-input v-model="edit_variant_id" dark outlined label="Variant" />
          </div>
          <div v-if="!editing_entry?.entry.wanted" class="col-12 col-sm-6">
            <q-select
              v-model="edit_condition"
              :options="condition_options"
              emit-value
              map-options
              dark
              outlined
              label="Condition"
            />
          </div>
          <div v-else class="col-12 col-sm-6 flex items-center">
            <q-checkbox v-model="edit_strong_language" dark label="Require this exact language" />
          </div>
          <div class="col-12" :class="{ 'col-sm-6': editing_manual_card }">
            <collection-folder-select
              v-model="edit_folder_id"
              :folders="collection_store.folders.value"
              dark
              outlined
              label="Collection"
            />
          </div>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="primary"
            text-color="dark"
            label="Save changes"
            :disable="edit_quantity < 1 || !edit_language_id || !edit_folder_id"
            no-caps
            @click="save_entry"
            ><q-tooltip :delay="1000">Save changes</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

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

    <q-dialog v-model="show_pokedex_options">
      <q-card class="app_surface text-white" style="width: 1200px; max-width: 96vw">
        <q-card-section><div class="text-h6">Pokédex binder options</div></q-card-section>
        <q-card-section><pokedex-binder-options v-model="editing_pokedex_config" /></q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="primary"
            text-color="dark"
            label="Save and recalculate"
            no-caps
            @click="save_pokedex_options"
            ><q-tooltip :delay="1000">Save and recalculate</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <manual-card-dialog v-model="show_manual_card_dialog" :initial_folder_id="folder_id" />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { useRoute, useRouter } from 'vue-router';
  import { computed, ref, watch } from 'vue';

  // import components
  import CollectionFolderSelect from '../components/collection_folder_select.vue';
  import PokedexBinderOptions from '../components/pokedex_binder_options.vue';
  import ManualCardDialog from '../components/manual_card_dialog.vue';
  import CardSortSelector from '../components/card_sort_selector.vue';
  import BackToTopButton from '../components/back_to_top_button.vue';
  import CardList from '../components/card_list.vue';

  // import utils
  import {
    get_card_by_id,
    get_languages,
    get_pokemon,
    get_set_by_id,
  } from '../services/catalog_storage';
  import { download_wanted_placeholders_pdf } from '../utils/wanted_placeholders_pdf';
  import { card_conditions, collection_store } from '../store/modules/collection';
  import { format_french_date, parse_french_date } from '../utils/dates';
  import { manual_image_store } from '../store/modules/manual_images';
  import { resolve_card_image } from '../utils/card_images';
  import { localized_value } from '../utils/localization';
  import { binder_store } from '../store/modules/binders';
  import { store } from '../store/index';
  import {
    build_display_card,
    cardmarket_display_price,
    compare_card_release_and_number,
    format_euro_price,
  } from '../utils/card_display';
  import {
    copy_pokedex_binder_config,
    pokedex_candidates_by_target,
    pokedex_placeholder_card,
    pokemon_id_from_requirement,
  } from '../utils/pokedex_binder';

  // import types
  import type { Pokedex_Binder_Config } from '../utils/pokedex_binder';
  import type { Manual_Collection_Card } from '../models/collection';
  import type { Collection_Folder_Filters } from '../store/index';
  import type { Display_Card } from '../utils/card_display';
  import type { Card_Sort } from '../utils/card_sorting';
  import type {
    Card_Condition,
    Collection_Entry,
    Collection_Folder,
  } from '../store/modules/collection';

  /* types */
  type Collection_Row = {
    entry: Collection_Entry;
    card: Display_Card;
    release_date: string | null;
    pokedex_number: number | null;
    unit_price: number | null;
    total_value: number;
  };

  /* hooks */
  const route = useRoute();
  const router = useRouter();

  /* const vars */
  const initial_folder_id = String(route.params.folderId ?? '');
  const stored_filters = store.state.collection_folder_filters[initial_folder_id];

  /* reactive vars */
  const search = ref<string>(stored_filters?.search ?? '');
  const collection_tab = ref<'owned' | 'wanted'>(stored_filters?.tab ?? 'owned');
  const selected_language_id = ref<string | null>(stored_filters?.language_id ?? null);
  const only_non_fitting = ref<boolean>(stored_filters?.only_non_fitting ?? false);
  const only_duplicates = ref<boolean>(stored_filters?.only_duplicates ?? false);
  const only_available_wanted = ref<boolean>(stored_filters?.only_available_wanted ?? false);
  const selected_sort = ref<Card_Sort>(stored_filters?.sort ?? 'release-desc');

  /* const vars */
  const collection_row_step = 48;

  /* reactive vars */
  const visible_row_count = ref<number>(collection_row_step);
  const selection_mode = ref<boolean>(false);
  const selected_entry_ids = ref<Set<string>>(new Set<string>());
  const show_transfer_dialog = ref<boolean>(false);
  const transfer_folder_id = ref<string>('');
  const transfer_quantities = ref<Record<string, number>>({});
  const transfer_pokedex_requirements = ref<Record<string, string>>({});
  const show_bulk_edit_dialog = ref<boolean>(false);
  const show_bulk_delete_dialog = ref<boolean>(false);
  const bulk_edit_language_id = ref<string>('');
  const entry_to_delete = ref<Collection_Row | null>(null);
  const show_manual_card_dialog = ref<boolean>(false);
  const show_pokedex_options = ref<boolean>(false);
  const editing_pokedex_config = ref<Pokedex_Binder_Config>({} as Pokedex_Binder_Config);
  const show_pokedex_candidates = ref<boolean>(false);
  const selected_pokedex_placeholder = ref<Display_Card | null>(null);
  const show_edit_dialog = ref<boolean>(false);
  const editing_entry = ref<Collection_Row | null>(null);
  const edit_quantity = ref<number>(1);
  const edit_language_id = ref<string>('');
  const edit_strong_language = ref<boolean>(false);
  const edit_condition = ref<Card_Condition>('NM');
  const edit_folder_id = ref<string>('');
  const edit_variant_id = ref<string>('normal');
  const edit_manual_name = ref<string>('');
  const edit_manual_set_name = ref<string>('');
  const edit_manual_number = ref<string>('');
  const edit_manual_category = ref<string>('pokemon');
  const edit_manual_rarity = ref<string>('');
  const edit_manual_pokemon_name = ref<string>('');
  const edit_manual_hp = ref<number | null>(null);
  const edit_manual_types = ref<string>('');
  const edit_manual_illustrator = ref<string>('');
  const edit_manual_notes = ref<string>('');
  const edit_manual_value = ref<number | null>(null);
  const edit_manual_release_date = ref<string>('');
  const edit_manual_image_file = ref<File | null>(null);
  const edit_manual_image_data_url = ref<string | null>(null);
  const edit_manual_image_preview = ref<string | null>(null);
  const edit_save_error = ref<string | null>(null);
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

  /* functions */
  const open_pokedex_options = (): void => {
    if (!folder.value?.pokedex_config) return;
    editing_pokedex_config.value = copy_pokedex_binder_config(folder.value.pokedex_config);
    show_pokedex_options.value = true;
  };
  const save_pokedex_options = (): void => {
    collection_store.update_pokedex_config(folder_id.value, editing_pokedex_config.value);
    show_pokedex_options.value = false;
  };

  /* computed vars */
  const destination_folders = computed<Collection_Folder[]>(() =>
    collection_store.folders.value.filter((candidate) => candidate.id !== folder_id.value),
  );

  /* const vars */
  const language_names = new Map(get_languages().map((language) => [language.id, language.name]));
  const all_language_options = get_languages().map((language) => ({
    label: language.name,
    value: language.id,
  }));
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

  /* computed vars */
  const edit_language_options = computed<{ label: string; value: string }[]>(() => {
    if (!editing_entry.value) return [];
    if (editing_entry.value.entry.set_id === 'manual-collection') {
      return get_languages().map((language) => ({ label: language.name, value: language.id }));
    }
    const set = get_set_by_id(editing_entry.value.entry.set_id);
    const card = get_card_by_id(
      editing_entry.value.entry.set_id,
      editing_entry.value.entry.card_id,
    );
    const variant = card?.variants.find(
      (candidate) => candidate.id === editing_entry.value?.entry.variant_id,
    );
    const language_ids = variant?.language_ids?.length
      ? variant.language_ids
      : (set?.language_ids ?? []);
    return language_ids.map((language_id) => ({
      label: language_names.get(language_id) ?? language_id.toUpperCase(),
      value: language_id,
    }));
  });

  /* const vars */
  const condition_options = card_conditions.map((entry) => ({ ...entry }));
  const category_options = ['pokemon', 'trainer', 'energy'];

  /* computed vars */
  const editing_manual_card = computed<Manual_Collection_Card | null>(() =>
    editing_entry.value?.entry.set_id === 'manual-collection'
      ? (collection_store.manual_cards.value.find(
          (card) => card.id === editing_entry.value?.entry.card_id,
        ) ?? null)
      : null,
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

  /* functions */
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

  const open_transfer_dialog = (): void => {
    transfer_folder_id.value = destination_folders.value[0]?.id ?? '';
    transfer_quantities.value = Object.fromEntries(
      selected_transfer_rows.value.map((row) => [row.entry.id, 1]),
    );
    transfer_pokedex_requirements.value = {};
    show_transfer_dialog.value = true;
  };

  /* computed vars */
  const transfer_pokedex_options_by_entry = computed<
    Record<string, Array<{ label: string; value: string }>>
  >(() =>
    Object.fromEntries(
      selected_transfer_rows.value.map((row) => [
        row.entry.id,
        collection_store.matching_pokedex_requirements({
          folder_id: transfer_folder_id.value,
          set_id: row.entry.set_id,
          card_id: row.entry.card_id,
          variant_id: row.entry.variant_id,
          language_id: row.entry.language_id,
        }),
      ]),
    ),
  );

  /* functions */
  const transfer_pokedex_options = (row: Collection_Row): Array<{ label: string; value: string }> =>
    transfer_pokedex_options_by_entry.value[row.entry.id] ?? [];

  /* computed vars */
  const missing_transfer_pokedex_choices = computed<boolean>(() =>
    selected_transfer_rows.value.some(
      (row) =>
        transfer_pokedex_options(row).length > 1 &&
        !transfer_pokedex_requirements.value[row.entry.id],
    ),
  );

  /* functions */
  const change_transfer_quantity = (entry_id: string, change: number, maximum: number): void => {
    const current = transfer_quantities.value[entry_id] ?? 1;
    transfer_quantities.value[entry_id] = Math.min(maximum, Math.max(1, current + change));
  };

  const confirm_bulk_transfer = (): void => {
    if (!transfer_folder_id.value) return;
    collection_store.transfer_entry_quantities(
      selected_transfer_rows.value.map((row) => ({
        entry_id: row.entry.id,
        quantity: Math.min(
          row.entry.quantity,
          Math.max(1, Math.floor(Number(transfer_quantities.value[row.entry.id]) || 1)),
        ),
        pokedex_requirement_id:
          transfer_pokedex_requirements.value[row.entry.id] ||
          (transfer_pokedex_options(row).length === 1
            ? transfer_pokedex_options(row)[0].value
            : undefined),
      })),
      transfer_folder_id.value,
    );
    selected_entry_ids.value = new Set();
    selection_mode.value = false;
    show_transfer_dialog.value = false;
    transfer_folder_id.value = '';
    transfer_quantities.value = {};
    transfer_pokedex_requirements.value = {};
  };

  const open_bulk_edit_dialog = (): void => {
    const selected_entries = collection_store.entries.value.filter((entry) =>
      selected_entry_ids.value.has(entry.id),
    );
    const selected_languages = new Set(selected_entries.map((entry) => entry.language_id));
    bulk_edit_language_id.value =
      selected_languages.size === 1 ? (selected_entries[0]?.language_id ?? '') : '';
    show_bulk_edit_dialog.value = true;
  };

  const confirm_bulk_edit = (): void => {
    if (!bulk_edit_language_id.value) return;
    collection_store.update_entries_language(
      [...selected_entry_ids.value],
      bulk_edit_language_id.value,
    );
    selected_entry_ids.value = new Set();
    selection_mode.value = false;
    show_bulk_edit_dialog.value = false;
    bulk_edit_language_id.value = '';
  };

  const confirm_bulk_delete = (): void => {
    for (const entry_id of selected_entry_ids.value) {
      collection_store.remove_entry(entry_id);
    }
    selected_entry_ids.value = new Set();
    selection_mode.value = false;
    show_bulk_delete_dialog.value = false;
  };

  const open_edit_entry = (row: Collection_Row): void => {
    editing_entry.value = row;
    edit_quantity.value = row.entry.quantity;
    edit_language_id.value = row.entry.language_id;
    edit_strong_language.value = row.entry.strong_language === true;
    edit_condition.value = row.entry.condition;
    edit_folder_id.value = row.entry.folder_id;
    edit_variant_id.value = row.entry.variant_id;
    edit_manual_image_file.value = null;
    edit_manual_image_data_url.value = null;
    edit_save_error.value = null;
    const manual_card =
      row.entry.set_id === 'manual-collection'
        ? collection_store.manual_cards.value.find((card) => card.id === row.entry.card_id)
        : null;
    if (manual_card) {
      edit_manual_name.value = manual_card.name;
      edit_manual_set_name.value = manual_card.set_name;
      edit_manual_number.value = manual_card.number;
      edit_manual_category.value = manual_card.category;
      edit_manual_rarity.value = manual_card.rarity;
      edit_manual_pokemon_name.value = manual_card.pokemon_name;
      edit_manual_hp.value = manual_card.hp;
      edit_manual_types.value = manual_card.types.join(', ');
      edit_manual_illustrator.value = manual_card.illustrator;
      edit_manual_notes.value = manual_card.notes;
      edit_manual_value.value = manual_card.estimated_value;
      edit_manual_release_date.value = manual_card.release_date
        ? format_french_date(manual_card.release_date)
        : '';
      const image = manual_image_store.find(
        'manual-collection',
        manual_card.id,
        row.entry.variant_id,
        row.entry.language_id,
      );
      edit_manual_image_preview.value = image
        ? `${image.url}?v=${encodeURIComponent(image.updated_at)}`
        : null;
    }
    show_edit_dialog.value = true;
  };

  const prepare_edit_manual_image = (file: File | null): void => {
    edit_manual_image_data_url.value = null;
    edit_save_error.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      edit_save_error.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      edit_manual_image_data_url.value = typeof reader.result === 'string' ? reader.result : null;
      edit_manual_image_preview.value = edit_manual_image_data_url.value;
    };
    reader.onerror = () => {
      edit_save_error.value = 'Unable to read the image.';
    };
    reader.readAsDataURL(file);
  };

  const open_edit_entry_by_id = (entry: Collection_Entry): void => {
    const row = collection_rows.value.find((candidate) => candidate.entry.id === entry.id);
    if (row) open_edit_entry(row);
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
      if (row) open_edit_entry(row);
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

  const save_entry = async (): Promise<void> => {
    if (
      !editing_entry.value ||
      edit_quantity.value < 1 ||
      !edit_language_id.value ||
      !edit_folder_id.value
    )
      return;
    const entry = editing_entry.value.entry;
    const manual_card = editing_manual_card.value;
    if (manual_card) {
      if (!edit_manual_name.value.trim()) return;
      const parsed_release_date = parse_french_date(edit_manual_release_date.value);
      if (edit_manual_release_date.value && !parsed_release_date) {
        edit_save_error.value = 'Release date must use DD-MM-YYYY and be a valid date.';
        return;
      }
      collection_store.update_manual_card(manual_card.id, {
        name: edit_manual_name.value,
        set_name: edit_manual_set_name.value,
        number: edit_manual_number.value,
        category: edit_manual_category.value,
        rarity: edit_manual_rarity.value,
        pokemon_name: edit_manual_pokemon_name.value,
        hp: edit_manual_hp.value,
        types: edit_manual_types.value.split(','),
        illustrator: edit_manual_illustrator.value,
        notes: edit_manual_notes.value,
        estimated_value: edit_manual_value.value,
        release_date: parsed_release_date,
      });
      entry.variant_id = edit_variant_id.value.trim() || 'normal';
      if (edit_manual_image_data_url.value) {
        try {
          await manual_image_store.upload({
            set_id: 'manual-collection',
            card_id: manual_card.id,
            variant_id: entry.variant_id,
            language_id: edit_language_id.value,
            data_url: edit_manual_image_data_url.value,
          });
        } catch (error) {
          edit_save_error.value = error instanceof Error ? error.message : String(error);
          return;
        }
      }
    }
    collection_store.update_entry(entry.id, {
      folder_id: edit_folder_id.value,
      language_id: edit_language_id.value,
      condition: edit_condition.value,
      quantity: edit_quantity.value,
      strong_language: edit_strong_language.value,
    });
    show_edit_dialog.value = false;
    editing_entry.value = null;
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
</script>
