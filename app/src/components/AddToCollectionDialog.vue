<template>
  <q-dialog v-model="isOpen">
    <q-card class="bg-grey-10 text-white" style="width: 420px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Add to collection</div>
        <div class="text-body2 text-grey-4">{{ cardName }}</div>
      </q-card-section>

      <q-card-section v-if="!collectionStore.isFileConnected.value">
        <q-banner class="bg-grey-9 text-grey-3 rounded-borders">
          Loading collection.json…
          <div v-if="collectionStore.saveError.value" class="text-negative q-mt-xs">
            {{ collectionStore.saveError.value }}
          </div>
        </q-banner>
      </q-card-section>

      <q-card-section class="column q-gutter-md">
        <collection-folder-select
          v-model="folderId"
          :folders="collectionStore.folders.value"
          dark
          outlined
          label="Collection"
          :disable="!collectionStore.isFileConnected.value"
        />
        <q-select
          v-model="condition"
          :options="conditionOptions"
          emit-value
          map-options
          dark
          outlined
          label="Condition"
          :disable="!collectionStore.isFileConnected.value"
        />
        <q-input v-model.number="quantity" type="number" min="1" step="1" dark outlined label="Quantity" :disable="!collectionStore.isFileConnected.value" />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey-4" v-close-popup />
        <q-btn color="primary" text-color="black" label="Add cards" :disable="quantity < 1 || !collectionStore.isFileConnected.value" @click="addCards" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useStore } from 'vuex';
  import { cardConditions, collectionStore } from '../utils/collection';
  import type { CardCondition } from '../utils/collection';
  import type { AppState } from '../store';
  import CollectionFolderSelect from './CollectionFolderSelect.vue';

  const props = defineProps<{
    modelValue: boolean;
    setId: string;
    cardId: string;
    variantId: string;
    languageId: string;
    cardName: string;
  }>();
  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    added: [];
  }>();

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
  });
  const store = useStore<AppState>();
  const folderId = ref(store.state.last_collection_folder_id);
  const condition = ref<CardCondition>('NM');
  const quantity = ref(1);

  const conditionOptions = cardConditions.map((entry) => ({ ...entry }));

  watch(
    [isOpen, collectionStore.isFileConnected],
    ([open, connected]) => {
      if (!open || !connected) return;
      const rememberedFolderId = store.state.last_collection_folder_id;
      const defaultFolder = collectionStore.ensureDefaultFolder();
      folderId.value = collectionStore.folders.value.some((folder) => folder.id === rememberedFolderId)
        ? rememberedFolderId
        : defaultFolder.id;
    },
    { immediate: true }
  );

  const addCards = (): void => {
    collectionStore.addCards({
      folder_id: folderId.value,
      set_id: props.setId,
      card_id: props.cardId,
      variant_id: props.variantId,
      language_id: props.languageId,
      condition: condition.value,
      quantity: quantity.value
    });
    store.commit('set_last_collection_folder_id', folderId.value);
    quantity.value = 1;
    isOpen.value = false;
    emit('added');
  };
</script>
