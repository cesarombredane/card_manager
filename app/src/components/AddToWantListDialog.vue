<template>
  <q-dialog v-model="isOpen">
    <q-card class="bg-grey-10 text-white" style="width: 420px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Add to want list</div>
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
        <q-select
          v-model="folderId"
          :options="folderOptions"
          emit-value
          map-options
          dark
          outlined
          label="Collection"
          :disable="!collectionStore.isFileConnected.value"
        />
        <q-input
          v-model.number="quantity"
          type="number"
          min="1"
          step="1"
          dark
          outlined
          label="Quantity wanted"
          :disable="!collectionStore.isFileConnected.value"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey-4" v-close-popup />
        <q-btn
          color="primary"
          text-color="black"
          label="Add to want list"
          :disable="quantity < 1 || !folderId || !collectionStore.isFileConnected.value"
          @click="addWanted"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { collectionStore, mainFolderId } from '../utils/collection';

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
  const folderId = ref(mainFolderId);
  const quantity = ref(1);
  const folderOptions = computed(() => collectionStore.folders.value.map((folder) => ({
    label: folder.name,
    value: folder.id
  })));

  watch(isOpen, (open) => {
    if (!open) return;
    folderId.value = collectionStore.folders.value.some((folder) => folder.id === mainFolderId)
      ? mainFolderId
      : collectionStore.folders.value[0]?.id ?? '';
    quantity.value = 1;
  }, { immediate: true });

  const addWanted = (): void => {
    collectionStore.addWanted({
      folder_id: folderId.value,
      set_id: props.setId,
      card_id: props.cardId,
      variant_id: props.variantId,
      language_id: props.languageId,
      quantity: quantity.value
    });
    isOpen.value = false;
    emit('added');
  };
</script>
