<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div>
        <div class="text-overline text-primary">My collection</div>
        <h1 class="text-h4 text-weight-bold q-my-none">Collection dashboard</h1>
        <div class="text-body2 text_secondary">
          {{ total_cards }} cards · Estimated collection value {{ format_euro_price(total_value) }}
        </div>
      </div>
      <div class="col-auto row q-gutter-sm">
        <q-btn
          flat
          color="secondary"
          icon="download"
          label="Export"
          no-caps
          :loading="exporting"
          @click="export_personal_data"
          ><q-tooltip :delay="1000">Export</q-tooltip></q-btn
        >
        <q-btn
          flat
          color="secondary"
          icon="upload"
          label="Import"
          no-caps
          :disable="importing"
          @click="import_file_input?.click()"
          ><q-tooltip :delay="1000">Import</q-tooltip></q-btn
        >
        <input
          ref="import_file_input"
          type="file"
          accept=".zip,application/zip"
          hidden
          @change="select_import_file"
        />
        <q-btn
          outline
          color="primary"
          icon="add_photo_alternate"
          label="Add manual card"
          no-caps
          :disable="!collection_store.is_file_connected.value"
          @click="show_manual_card_dialog = true"
          ><q-tooltip :delay="1000">Add manual card</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          icon="create_new_folder"
          label="New collection"
          no-caps
          :disable="!collection_store.is_file_connected.value"
          @click="open_create_folder"
          ><q-tooltip :delay="1000">New collection</q-tooltip></q-btn
        >
      </div>
    </section>

    <q-banner class="app_surface text_secondary q-mb-lg rounded-borders">
      <template v-if="collection_store.is_file_connected.value">
        Collection changes are saved automatically to
        <strong>frontend/data/collection.json</strong>.
      </template>
      <template v-else> Loading collection.json… </template>
      <div v-if="collection_store.save_error.value" class="text-negative q-mt-xs">
        {{ collection_store.save_error.value }}
      </div>
    </q-banner>

    <section>
      <div class="row justify-end q-mb-md">
        <q-select
          v-model="collection_sort"
          :options="collection_sort_options"
          emit-value
          map-options
          dark
          dense
          outlined
          label="Sort collections"
          style="width: 240px"
        />
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-6">
          <div class="row items-center q-gutter-sm q-mb-md">
            <q-icon name="inventory" color="primary" size="28px" />
            <div class="text-h5">Boxes</div>
            <q-badge color="dark">{{ box_summaries.length }}</q-badge>
          </div>
          <div class="column q-gutter-md">
            <collection-folder-summary-card
              v-for="summary in box_summaries"
              :key="summary.folder.id"
              v-bind="summary"
              @settings="open_rename_folder"
              @delete="open_delete_folder"
            />
            <q-banner v-if="box_summaries.length === 0" class="app_surface text_secondary">
              <empty-state
                title="No box collections"
                description="Create a box collection to organize your cards."
                icon="inventory"
              />
            </q-banner>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <div class="row items-center q-gutter-sm q-mb-md">
            <q-icon name="auto_stories" color="primary" size="28px" />
            <div class="text-h5">Binders</div>
            <q-badge color="dark">{{ binder_summaries.length }}</q-badge>
          </div>
          <div class="column q-gutter-md">
            <collection-folder-summary-card
              v-for="summary in binder_summaries"
              :key="summary.folder.id"
              v-bind="summary"
              @settings="open_rename_folder"
              @delete="open_delete_folder"
            />
            <q-banner v-if="binder_summaries.length === 0" class="app_surface text_secondary">
              <empty-state
                title="No binder collections"
                description="Create a binder collection to plan its pages."
                icon="auto_stories"
              />
            </q-banner>
          </div>
        </div>
      </div>
    </section>

    <q-dialog v-model="show_folder_dialog">
      <q-card class="app_surface text-white" style="width: 560px; max-width: 94vw">
        <q-card-section>
          <div class="text-h6">
            {{ editing_folder ? 'Collection settings' : 'Create collection' }}
          </div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <div>
            <div class="text-caption text_secondary q-mb-xs">Collection type</div>
            <div class="row items-center no-wrap q-gutter-sm">
              <q-btn-toggle
                v-model="folder_type"
                :options="folder_type_options"
                color="dark"
                text-color="secondary"
                toggle-color="primary"
                toggle-text-color="dark"
                unelevated
              />
              <q-btn
                v-if="!editing_folder && folder_type === 'binder'"
                flat
                dense
                color="primary"
                icon="auto_awesome"
                label="Create from template"
                no-caps
                @click="open_template_dialog"
                ><q-tooltip :delay="1000">Create from template</q-tooltip></q-btn
              >
            </div>
          </div>
          <q-input
            v-model="folder_name"
            dark
            outlined
            autofocus
            label="Collection name"
            @keyup.enter="save_folder"
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
            label="Save"
            :disable="!folder_name.trim()"
            no-caps
            @click="save_folder"
            ><q-tooltip :delay="1000">Save</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="show_template_dialog">
      <q-card class="app_surface text-white" style="width: 1200px; max-width: 96vw">
        <q-card-section>
          <div class="text-h6">Create binder from template</div>
          <div class="text-body2 text_secondary">Build a complete wanted list automatically.</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-select
            v-model="template_mode"
            :options="[
              { label: 'Master Set', value: 'master-set' },
              { label: 'Pokédex', value: 'pokedex' },
            ]"
            emit-value
            map-options
            dark
            outlined
            label="Template"
          />
          <q-select
            v-if="template_mode === 'master-set'"
            v-model="template_set_id"
            :options="set_options"
            emit-value
            map-options
            use-input
            input-debounce="0"
            dark
            outlined
            label="Set"
            @filter="filter_set_options"
          />
          <q-input v-model="template_name" dark outlined label="Collection name" />
          <pokedex-binder-options
            v-if="template_mode === 'pokedex'"
            v-model="template_pokedex_config"
            class="q-ml-xs q-mt-xs"
          />
          <q-select
            v-if="template_mode === 'master-set'"
            v-model="template_language_id"
            :options="template_language_options"
            emit-value
            map-options
            dark
            outlined
            label="Preferred language"
            :disable="template_language_options.length <= 1"
          />
          <q-checkbox
            v-if="template_mode === 'master-set'"
            v-model="template_strong_language"
            dark
            label="Require wanted cards to be in this exact language"
          />
          <q-banner
            v-if="template_mode === 'master-set' && template_variant_count"
            class="app_surface text_secondary rounded-borders"
          >
            {{ template_variant_count }} card
            {{ template_variant_count === 1 ? 'entry' : 'entries' }} will be added to the wanted
            list.
          </q-banner>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="primary"
            text-color="dark"
            :label="template_mode === 'pokedex' ? 'Create Pokédex binder' : 'Create Master Set'"
            :disable="
              !template_name.trim() ||
              (template_mode === 'master-set' && (!template_set_id || !template_language_id))
            "
            no-caps
            @click="create_template"
            ><q-tooltip :delay="1000">{{
              template_mode === 'pokedex' ? 'Create Pokédex binder' : 'Create Master Set'
            }}</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <confirm-dialog
      v-model="show_binder_conversion_warning"
      persistent
      destructive
      title="Convert this binder to a box?"
      message="This binder contains placed cards or custom assets. Converting it to a box will permanently delete its binder layout and configuration."
      confirm_label="Convert and delete binder layout"
      cancel_label="Keep as binder"
      confirm_tooltip="Convert to a box and permanently remove its layout"
      cancel_tooltip="Keep the binder and its layout"
      @confirm="confirm_binder_conversion"
      @cancel="cancel_binder_conversion"
    >
      <q-banner class="status_error text-white rounded-borders q-mt-md">
        The cards remain in the collection, but page layout, slots, proxies, and decorative images
        in this binder will be removed.
      </q-banner>
    </confirm-dialog>

    <manual-card-dialog v-model="show_manual_card_dialog" />

    <q-dialog
      :model-value="folder_to_delete !== null"
      @update:model-value="
        (value) => {
          if (!value) folder_to_delete = null;
        }
      "
    >
      <q-card class="app_surface text-white">
        <q-card-section>
          <div class="text-h6">Delete {{ folder_to_delete?.name }}?</div>
          <div class="text-body2 text_secondary q-mt-sm">
            <template v-if="folder_delete_entry_count > 0 && delete_destination_folders.length">
              Its {{ folder_delete_entry_count }} entries will be moved to another collection before
              deletion.
            </template>
            <template v-else-if="folder_delete_entry_count > 0">
              Create another collection or move these cards before deleting this collection.
            </template>
            <template v-else>This collection is empty.</template>
          </div>
        </q-card-section>
        <q-card-section v-if="folder_delete_entry_count > 0 && delete_destination_folders.length">
          <collection-folder-select
            v-model="delete_destination_folder_id"
            :folders="delete_destination_folders"
            dark
            outlined
            label="Move cards to"
          />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn flat color="secondary" label="Cancel" no-caps @click="folder_to_delete = null"
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="negative"
            label="Delete collection"
            :disable="folder_delete_entry_count > 0 && !delete_destination_folder_id"
            no-caps
            @click="confirm_delete_folder"
            ><q-tooltip :delay="1000">Delete collection</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="import_file !== null" persistent>
      <q-card class="app_surface text-white" style="width: 520px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Import personal data?</div>
          <div class="text-body2 text_secondary q-mt-sm">{{ import_file?.name }}</div>
        </q-card-section>
        <q-card-section>
          <q-banner class="status_error text-white rounded-borders">
            <template #avatar><q-icon name="warning" color="white" /></template>
            This will permanently replace every collection, binder, manual card, proxy, decorative
            image, and personal card image currently stored in Card Manager.
          </q-banner>
          <div v-if="backup_error" class="text-negative q-mt-md">{{ backup_error }}</div>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn
            flat
            color="secondary"
            label="Cancel"
            :disable="importing"
            no-caps
            @click="cancel_import"
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="negative"
            label="Overwrite and import"
            :loading="importing"
            no-caps
            @click="import_personal_data"
            ><q-tooltip :delay="1000">Overwrite and import</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-banner
      v-if="backup_error && !import_file"
      class="status_error text-white q-mt-lg rounded-borders"
    >
      {{ backup_error }}
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import components
  import ConfirmDialog from '../components/common/confirm_dialog.vue';
  import CollectionFolderSummaryCard from '../components/collection_folder_summary_card.vue';
  import CollectionFolderSelect from '../components/collection_folder_select.vue';
  import PokedexBinderOptions from '../components/pokedex_binder_options.vue';
  import ManualCardDialog from '../components/manual_card_dialog.vue';
  import EmptyState from '../components/common/empty_state.vue';

  // import utils
  import {
    export_personal_data as request_personal_export,
    import_personal_data as request_personal_import,
  } from '../services/personal_data';
  import { cardmarket_display_price, format_euro_price } from '../utils/card_display';
  import { default_pokedex_config } from '../utils/pokedex_binder';
  import { collection_store } from '../store/modules/collection';
  import { localized_value } from '../utils/localization';
  import { binder_store } from '../store/modules/binders';
  import {
    get_card_by_id,
    get_cards_by_set_id,
    get_languages,
    get_sets,
    get_set_by_id,
  } from '../services/catalog_storage';
  import { store } from '../store/index';

  // import types
  import type { Collection_Folder, Collection_Folder_Type } from '../store/modules/collection';
  import type { Pokedex_Binder_Config } from '../utils/pokedex_binder';
  import type { Set } from '../models/catalog';

  /* reactive vars */
  const show_folder_dialog = ref<boolean>(false);
  const show_template_dialog = ref<boolean>(false);
  const show_manual_card_dialog = ref<boolean>(false);
  const editing_folder = ref<Collection_Folder | null>(null);
  const folder_to_delete = ref<Collection_Folder | null>(null);
  const delete_destination_folder_id = ref<string>('');
  const folder_name = ref<string>('');
  const folder_type = ref<Collection_Folder_Type>('box');

  /* const vars */
  const folder_type_options = [
    { label: 'Box', value: 'box', icon: 'inventory' },
    { label: 'Binder', value: 'binder', icon: 'auto_stories' },
  ];

  /* reactive vars */
  const import_file_input = ref<HTMLInputElement | null>(null);
  const import_file = ref<File | null>(null);
  const importing = ref<boolean>(false);
  const exporting = ref<boolean>(false);
  const backup_error = ref<string | null>(null);
  const collection_sort = ref<'name' | 'cards' | 'value'>('name');

  /* const vars */
  const collection_sort_options = [
    { label: 'Name', value: 'name' },
    { label: 'Card count', value: 'cards' },
    { label: 'Collection value', value: 'value' },
  ];

  /* reactive vars */
  const show_binder_conversion_warning = ref<boolean>(false);
  const pending_binder_conversion = ref<Collection_Folder | null>(null);
  const template_set_id = ref<string>('');
  const template_name = ref<string>('');
  const template_language_id = ref<string>('');
  const template_strong_language = ref<boolean>(false);
  const template_mode = ref<'master-set' | 'pokedex'>('master-set');
  const template_pokedex_config = ref<Pokedex_Binder_Config>(
    default_pokedex_config(store.state.selected_language_id),
  );

  /* const vars */
  const language_names = new Map(get_languages().map((language) => [language.id, language.name]));
  const all_set_options = get_sets()
    .map((set) => ({
      label: `${localized_value(set.name, 'en') ?? Object.values(set.name)[0] ?? set.id} (${set.id})`,
      value: set.id,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  /* reactive vars */
  const set_options = ref<{ label: string; value: string }[]>([...all_set_options]);

  /* computed vars */
  const selected_template_set = computed<Set | null>(() => get_set_by_id(template_set_id.value));
  const template_language_options = computed<{ label: string; value: string }[]>(() =>
    (selected_template_set.value?.language_ids ?? []).map((id) => ({
      label: language_names.get(id) ?? id,
      value: id,
    })),
  );
  const template_variant_count = computed<number>(() =>
    get_cards_by_set_id(template_set_id.value).reduce(
      (total, card) => total + card.variants.length,
      0,
    ),
  );

  /* watchers */
  watch(template_set_id, () => {
    const set = selected_template_set.value;
    if (!set) {
      template_name.value = '';
      template_language_id.value = '';
      return;
    }
    const preferred_language = set.language_ids.includes('en') ? 'en' : (set.language_ids[0] ?? '');
    template_language_id.value = preferred_language;
    template_name.value = `${localized_value(set.name, preferred_language) ?? localized_value(set.name, 'en') ?? set.id} Master Set`;
  });

  watch(template_mode, (mode) => {
    if (mode === 'pokedex') template_name.value = 'National Pokédex';
  });

  /* functions */
  const entry_value = (set_id: string, card_id: string, variant_id: string): number => {
    if (set_id === 'manual-collection') {
      return (
        collection_store.manual_cards.value.find((card) => card.id === card_id)?.estimated_value ??
        0
      );
    }
    const variant = get_card_by_id(set_id, card_id)?.variants.find(
      (candidate) => candidate.id === variant_id,
    );
    return cardmarket_display_price(variant?.cardmarket) ?? 0;
  };

  /* computed vars */
  const folder_summaries = computed<
    { folder: Collection_Folder; entries: number; cards: number; wanted: number; value: number }[]
  >(() =>
    collection_store.folders.value.map((folder) => {
      const folder_entries = collection_store.entries.value.filter(
        (entry) => entry.folder_id === folder.id,
      );
      const entries = folder_entries.filter((entry) => !entry.wanted);
      return {
        folder,
        entries: entries.length,
        cards: entries.reduce((total, entry) => total + entry.quantity, 0),
        wanted: folder_entries
          .filter((entry) => entry.wanted)
          .reduce((total, entry) => total + entry.quantity, 0),
        value: entries.reduce(
          (total, entry) =>
            total + entry.quantity * entry_value(entry.set_id, entry.card_id, entry.variant_id),
          0,
        ),
      };
    }),
  );

  const total_cards = computed<number>(() =>
    folder_summaries.value.reduce((total, folder) => total + folder.cards, 0),
  );
  const total_value = computed<number>(() =>
    folder_summaries.value.reduce((total, folder) => total + folder.value, 0),
  );
  const sorted_summaries = computed<
    { folder: Collection_Folder; entries: number; cards: number; wanted: number; value: number }[]
  >(() =>
    [...folder_summaries.value].sort((left, right) => {
      if (collection_sort.value === 'cards')
        return right.cards - left.cards || left.folder.name.localeCompare(right.folder.name);
      if (collection_sort.value === 'value')
        return right.value - left.value || left.folder.name.localeCompare(right.folder.name);
      return left.folder.name.localeCompare(right.folder.name);
    }),
  );
  const box_summaries = computed<
    { folder: Collection_Folder; entries: number; cards: number; wanted: number; value: number }[]
  >(() => sorted_summaries.value.filter((summary) => summary.folder.type === 'box'));
  const binder_summaries = computed<
    { folder: Collection_Folder; entries: number; cards: number; wanted: number; value: number }[]
  >(() => sorted_summaries.value.filter((summary) => summary.folder.type === 'binder'));

  /* functions */
  const open_create_folder = (): void => {
    editing_folder.value = null;
    folder_name.value = '';
    folder_type.value = 'box';
    show_folder_dialog.value = true;
  };

  const filter_set_options = (value: string, update: (callback: () => void) => void): void => {
    update(() => {
      const query = value.trim().toLocaleLowerCase();
      set_options.value = query
        ? all_set_options.filter((option) => option.label.toLocaleLowerCase().includes(query))
        : [...all_set_options];
    });
  };

  const open_template_dialog = (): void => {
    show_folder_dialog.value = false;
    template_set_id.value = '';
    template_name.value = '';
    template_language_id.value = '';
    template_strong_language.value = false;
    template_mode.value = 'master-set';
    template_pokedex_config.value = default_pokedex_config(store.state.selected_language_id);
    set_options.value = [...all_set_options];
    show_template_dialog.value = true;
  };

  const create_master_set = (): void => {
    if (!template_set_id.value || !template_name.value.trim() || !template_language_id.value)
      return;
    const folder = collection_store.create_folder(template_name.value, 'binder');
    collection_store.add_wanted_entries(
      get_cards_by_set_id(template_set_id.value).flatMap((card) =>
        card.variants.map((variant) => ({
          folder_id: folder.id,
          set_id: card.set_id,
          card_id: card.id,
          variant_id: variant.id,
          language_id: template_language_id.value,
          quantity: 1,
          strong_language: template_strong_language.value,
        })),
      ),
    );
    show_template_dialog.value = false;
  };

  const create_template = (): void => {
    if (template_mode.value === 'pokedex') {
      if (!template_name.value.trim()) return;
      collection_store.create_pokedex_folder(template_name.value, template_pokedex_config.value);
      show_template_dialog.value = false;
      return;
    }
    create_master_set();
  };

  const open_rename_folder = (folder: Collection_Folder): void => {
    editing_folder.value = folder;
    folder_name.value = folder.name;
    folder_type.value = folder.type ?? 'binder';
    show_folder_dialog.value = true;
  };

  const save_folder = (): void => {
    if (!folder_name.value.trim()) return;
    if (editing_folder.value) {
      if (editing_folder.value.type === 'binder' && folder_type.value === 'box') {
        const binder = binder_store.get(editing_folder.value.id);
        const binder_has_content = Boolean(
          binder?.slots.some((slot) => slot !== null) ||
          binder?.proxies.length ||
          binder?.images.length ||
          binder?.image_placements.length,
        );
        if (binder_has_content) {
          pending_binder_conversion.value = editing_folder.value;
          show_binder_conversion_warning.value = true;
          return;
        }
        binder_store.remove(editing_folder.value.id);
      }
      collection_store.update_folder(editing_folder.value.id, folder_name.value, folder_type.value);
    } else {
      collection_store.create_folder(folder_name.value, folder_type.value);
    }
    show_folder_dialog.value = false;
  };

  const cancel_binder_conversion = (): void => {
    show_binder_conversion_warning.value = false;
    pending_binder_conversion.value = null;
    folder_type.value = 'binder';
  };

  const confirm_binder_conversion = (): void => {
    const folder = pending_binder_conversion.value;
    if (!folder) return;
    binder_store.remove(folder.id);
    collection_store.update_folder(folder.id, folder_name.value, 'box');
    show_binder_conversion_warning.value = false;
    show_folder_dialog.value = false;
    pending_binder_conversion.value = null;
    editing_folder.value = null;
  };

  const confirm_delete_folder = (): void => {
    if (folder_to_delete.value) {
      const entry_ids = collection_store.entries.value
        .filter(
          (entry) =>
            entry.folder_id === folder_to_delete.value?.id &&
            !(entry.wanted && entry.pokedex_requirement_id),
        )
        .map((entry) => entry.id);
      if (entry_ids.length > 0) {
        if (!delete_destination_folder_id.value) return;
        collection_store.transfer_entries(entry_ids, delete_destination_folder_id.value);
      }
      binder_store.remove(folder_to_delete.value.id);
      collection_store.delete_folder(folder_to_delete.value.id);
    }
    folder_to_delete.value = null;
    delete_destination_folder_id.value = '';
  };

  /* computed vars */
  const folder_delete_entry_count = computed<number>(() =>
    folder_to_delete.value
      ? collection_store.entries.value.filter(
          (entry) =>
            entry.folder_id === folder_to_delete.value?.id &&
            !(entry.wanted && entry.pokedex_requirement_id),
        ).length
      : 0,
  );
  const delete_destination_folders = computed<Collection_Folder[]>(() =>
    collection_store.folders.value.filter((folder) => folder.id !== folder_to_delete.value?.id),
  );

  /* functions */
  const open_delete_folder = (folder: Collection_Folder): void => {
    folder_to_delete.value = folder;
    delete_destination_folder_id.value = delete_destination_folders.value[0]?.id ?? '';
  };

  const response_error = async (response: Response, fallback: string): Promise<string> => {
    try {
      const body = (await response.json()) as { error?: string };
      return body.error ?? fallback;
    } catch {
      return fallback;
    }
  };

  const export_personal_data = async (): Promise<void> => {
    exporting.value = true;
    backup_error.value = null;
    try {
      const response = await request_personal_export();
      if (!response.ok)
        throw new Error(await response_error(response, 'Unable to export personal data'));
      const blob = await response.blob();
      const content_disposition = response.headers.get('Content-Disposition') ?? '';
      const filename =
        /filename="([^"]+)"/.exec(content_disposition)?.[1] ?? 'card-manager-backup.zip';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      backup_error.value = error instanceof Error ? error.message : String(error);
    } finally {
      exporting.value = false;
    }
  };

  const select_import_file = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    import_file.value = input.files?.[0] ?? null;
    backup_error.value = null;
  };

  const cancel_import = (): void => {
    import_file.value = null;
    if (import_file_input.value) import_file_input.value.value = '';
    backup_error.value = null;
  };

  const import_personal_data = async (): Promise<void> => {
    if (!import_file.value) return;
    importing.value = true;
    backup_error.value = null;
    try {
      const response = await request_personal_import(import_file.value);
      if (!response.ok)
        throw new Error(await response_error(response, 'Unable to import personal data'));
      window.location.reload();
    } catch (error) {
      backup_error.value = error instanceof Error ? error.message : String(error);
      importing.value = false;
    }
  };
</script>
