<template>
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
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import components
  import CollectionFolderSelect from '../collection_folder_select.vue';

  // import utils
  import { collection_store } from '../../store/modules/collection';
  import { binder_store } from '../../store/modules/binders';

  // import types
  import type { Collection_Folder } from '../../models/collection';

  /* reactive vars */
  const folder_to_delete = ref<Collection_Folder | null>(null);

  const delete_destination_folder_id = ref<string>('');

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

  const open_delete_folder = (folder: Collection_Folder): void => {
    folder_to_delete.value = folder;
    delete_destination_folder_id.value = delete_destination_folders.value[0]?.id ?? '';
  };

  /* public methods */
  defineExpose({ open: open_delete_folder });
</script>
