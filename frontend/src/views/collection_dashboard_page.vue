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
        <personal-data-actions />

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
          @click="folder_editor?.create()"
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
              @settings="folder_editor?.edit($event)"
              @delete="delete_dialog?.open($event)"
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
              @settings="folder_editor?.edit($event)"
              @delete="delete_dialog?.open($event)"
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

    <collection-folder-dialog ref="folder_editor" @create_template="template_dialog?.open()" />

    <collection-template-dialog ref="template_dialog" />

    <manual-card-dialog v-model="show_manual_card_dialog" />

    <collection-delete-dialog ref="delete_dialog" />
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import components
  import CollectionTemplateDialog from '../components/collection/collection_template_dialog.vue';
  import CollectionFolderDialog from '../components/collection/collection_folder_dialog.vue';
  import CollectionDeleteDialog from '../components/collection/collection_delete_dialog.vue';
  import CollectionFolderSummaryCard from '../components/collection_folder_summary_card.vue';
  import PersonalDataActions from '../components/collection/personal_data_actions.vue';
  import ManualCardDialog from '../components/manual_card_dialog.vue';
  import EmptyState from '../components/common/empty_state.vue';

  // import utils
  import { cardmarket_display_price, format_euro_price } from '../utils/card_display';
  import { collection_store } from '../store/modules/collection';
  import { get_card_by_id } from '../services/catalog_storage';

  // import types
  import type { Collection_Folder } from '../store/modules/collection';

  /* const vars */
  const collection_sort_options = [
    { label: 'Name', value: 'name' },
    { label: 'Card count', value: 'cards' },
    { label: 'Collection value', value: 'value' },
  ];

  /* reactive vars */
  const folder_editor = ref<InstanceType<typeof CollectionFolderDialog> | null>(null);

  const template_dialog = ref<InstanceType<typeof CollectionTemplateDialog> | null>(null);

  const delete_dialog = ref<InstanceType<typeof CollectionDeleteDialog> | null>(null);

  const show_manual_card_dialog = ref<boolean>(false);

  const collection_sort = ref<'name' | 'cards' | 'value'>('name');

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
</script>
