<template>
  <q-dialog v-model="show_transfer_dialog">
    <q-card class="app_surface text-white" style="width: 480px; max-width: 94vw">
      <q-card-section>
        <div class="text-h6">Move selected cards</div>
        <div class="text-body2 text_secondary">
          Move {{ selected_transfer_rows.length }} selected
          {{ selected_transfer_rows.length === 1 ? 'entry' : 'entries' }} to another collection.
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
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import components
  import CollectionFolderSelect from '../collection_folder_select.vue';

  // import utils
  import { collection_store } from '../../store/modules/collection';

  // import types
  import type { Collection_Row } from '../../models/collection_view';
  import type { Collection_Folder } from '../../models/collection';

  /* hooks */
  const props = defineProps<{ rows: Collection_Row[]; destination_folders: Collection_Folder[] }>();

  const emit = defineEmits<{ saved: [] }>();

  /* reactive vars */
  const show_transfer_dialog = ref<boolean>(false);

  const transfer_folder_id = ref<string>('');

  const transfer_quantities = ref<Record<string, number>>({});

  const transfer_pokedex_requirements = ref<Record<string, string>>({});

  /* computed vars */
  const selected_transfer_rows = computed<Collection_Row[]>(() => props.rows);

  const destination_folders = computed<Collection_Folder[]>(() => props.destination_folders);

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

  const missing_transfer_pokedex_choices = computed<boolean>(() =>
    selected_transfer_rows.value.some(
      (row) =>
        transfer_pokedex_options(row).length > 1 &&
        !transfer_pokedex_requirements.value[row.entry.id],
    ),
  );

  /* functions */
  const open_transfer_dialog = (): void => {
    transfer_folder_id.value = destination_folders.value[0]?.id ?? '';
    transfer_quantities.value = Object.fromEntries(
      selected_transfer_rows.value.map((row) => [row.entry.id, 1]),
    );
    transfer_pokedex_requirements.value = {};
    show_transfer_dialog.value = true;
  };

  const transfer_pokedex_options = (row: Collection_Row): Array<{ label: string; value: string }> =>
    transfer_pokedex_options_by_entry.value[row.entry.id] ?? [];

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
    emit('saved');
    show_transfer_dialog.value = false;
    transfer_folder_id.value = '';
    transfer_quantities.value = {};
    transfer_pokedex_requirements.value = {};
  };

  /* public methods */
  defineExpose({ open: open_transfer_dialog });
</script>
