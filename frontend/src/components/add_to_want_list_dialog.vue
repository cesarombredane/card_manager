<template>
  <q-dialog v-model="is_open">
    <q-card class="app_surface text-white" style="width: 420px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Add to want list</div>
        <div class="text-body2 text_secondary">{{ card_name }}</div>
      </q-card-section>

      <q-card-section v-if="!collection_store.is_file_connected.value">
        <q-banner class="app_surface text_secondary rounded-borders">
          Loading collection.json…
          <div v-if="collection_store.save_error.value" class="text-negative q-mt-xs">
            {{ collection_store.save_error.value }}
          </div>
        </q-banner>
      </q-card-section>

      <q-card-section class="column q-gutter-md">
        <collection-folder-select
          v-model="folder_id"
          :folders="collection_store.folders.value"
          dark
          outlined
          label="Collection"
          :disable="!collection_store.is_file_connected.value"
        />
        <q-input
          v-model.number="quantity"
          type="number"
          min="1"
          step="1"
          dark
          outlined
          label="Quantity wanted"
          :disable="!collection_store.is_file_connected.value"
        />
        <q-checkbox
          v-model="strong_language"
          dark
          label="Require this exact language"
          :disable="!collection_store.is_file_connected.value"
        />
      </q-card-section>

      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat label="Cancel" color="secondary" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Add to want list"
          :disable="quantity < 1 || !folder_id || !collection_store.is_file_connected.value"
          no-caps
          @click="add_wanted"
          ><q-tooltip :delay="1000">Add to want list</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import components
  import CollectionFolderSelect from './collection_folder_select.vue';

  // import utils
  import { collection_store } from '../store/modules/collection';
  import { use_store } from '../store';

  /* hooks */
  const props = defineProps<{
    modelValue: boolean;
    set_id: string;
    card_id: string;
    variant_id: string;
    language_id: string;
    card_name: string;
  }>();
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    added: [];
  }>();

  /* computed vars */
  const is_open = computed<boolean>({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  });

  /* hooks */
  const store = use_store();

  /* reactive vars */
  const folder_id = ref<string>(store.state.last_collection_folder_id);
  const quantity = ref<number>(1);
  const strong_language = ref<boolean>(false);

  /* watchers */
  watch(
    [is_open, collection_store.is_file_connected],
    ([open, connected]) => {
      if (!open || !connected) return;
      const remembered_folder_id = store.state.last_collection_folder_id;
      const default_folder = collection_store.ensure_default_folder();
      folder_id.value = collection_store.folders.value.some(
        (folder) => folder.id === remembered_folder_id,
      )
        ? remembered_folder_id
        : default_folder.id;
      quantity.value = 1;
      strong_language.value = false;
    },
    { immediate: true },
  );

  /* functions */
  const add_wanted = (): void => {
    collection_store.add_wanted({
      folder_id: folder_id.value,
      set_id: props.set_id,
      card_id: props.card_id,
      variant_id: props.variant_id,
      language_id: props.language_id,
      quantity: quantity.value,
      strong_language: strong_language.value,
    });
    store.commit('set_last_collection_folder_id', folder_id.value);
    quantity.value = 1;
    is_open.value = false;
    emit('added');
  };
</script>
