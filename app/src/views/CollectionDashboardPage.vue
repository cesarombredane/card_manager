<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div>
        <div class="text-overline text-primary">My collection</div>
        <div class="text-h4 text-weight-bold">Collection dashboard</div>
        <div class="text-body2 text-grey-4">
          {{ totalCards }} cards · Estimated Cardmarket value {{ formatEuroPrice(totalValue) }}
        </div>
      </div>
      <div class="col-auto row q-gutter-sm">
        <q-btn
          color="primary"
          text-color="black"
          icon="create_new_folder"
          label="New folder"
          no-caps
          :disable="!collectionStore.isFileConnected.value"
          @click="openCreateFolder"
        />
      </div>
    </section>

    <q-banner class="bg-grey-10 text-grey-3 q-mb-lg rounded-borders">
      <template v-if="collectionStore.isFileConnected.value">
        Collection changes are saved automatically to <strong>app/data/collection.json</strong>.
      </template>
      <template v-else>
        Loading collection.json…
      </template>
      <div v-if="collectionStore.saveError.value" class="text-negative q-mt-xs">{{ collectionStore.saveError.value }}</div>
    </q-banner>

    <section class="row q-col-gutter-md">
      <div v-for="summary in folderSummaries" :key="summary.folder.id" class="col-12 col-sm-6 col-lg-4">
        <q-card flat bordered class="bg-grey-10 text-white full-height">
          <q-card-section>
            <div class="row no-wrap items-start justify-between">
              <div>
                <div class="text-h6">{{ summary.folder.name }}</div>
                <div class="text-caption text-grey-4">
                  {{ summary.cards }} cards · {{ summary.entries }} distinct entries
                </div>
              </div>
              <q-icon :name="summary.folder.id === mainFolderId ? 'inventory_2' : 'folder'" color="yellow-6" size="32px" />
            </div>
            <div class="text-h5 text-yellow-6 text-weight-bold q-mt-md">
              {{ formatEuroPrice(summary.value) }}
            </div>
          </q-card-section>
          <q-card-actions>
            <q-btn
              class="full-width"
              unelevated
              size="lg"
              color="primary"
              text-color="black"
              icon-right="arrow_forward"
              label="Open folder"
              no-caps
              :to="`/collection/folder/${summary.folder.id}`"
            />
          </q-card-actions>
          <q-card-actions>
            <q-space />
            <q-btn flat round dense color="grey-4" icon="edit" @click="openRenameFolder(summary.folder)">
              <q-tooltip>Rename folder</q-tooltip>
            </q-btn>
            <q-btn
              v-if="summary.folder.id !== mainFolderId"
              flat
              round
              dense
              color="negative"
              icon="delete"
              @click="folderToDelete = summary.folder"
            >
              <q-tooltip>Delete folder and move its cards to Main collection</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </section>

    <q-dialog v-model="showFolderDialog">
      <q-card class="bg-grey-10 text-white" style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">{{ editingFolder ? 'Rename folder' : 'Create folder' }}</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="folderName" dark outlined autofocus label="Folder name" @keyup.enter="saveFolder" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" label="Save" :disable="!folderName.trim()" @click="saveFolder" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="folderToDelete !== null" @update:model-value="value => { if (!value) folderToDelete = null; }">
      <q-card class="bg-grey-10 text-white">
        <q-card-section>
          <div class="text-h6">Delete {{ folderToDelete?.name }}?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            Its cards will be transferred to Main collection.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" @click="folderToDelete = null" />
          <q-btn color="negative" label="Delete folder" @click="confirmDeleteFolder" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { cardmarketDisplayPrice, formatEuroPrice } from '../utils/cardDisplay';
  import { getCardById } from '../utils/dataManagement';
  import { collectionStore, mainFolderId } from '../utils/collection';
  import type { CollectionFolder } from '../utils/collection';

  const showFolderDialog = ref(false);
  const editingFolder = ref<CollectionFolder | null>(null);
  const folderToDelete = ref<CollectionFolder | null>(null);
  const folderName = ref('');

  const entryValue = (setId: string, cardId: string, variantId: string): number => {
    const variant = getCardById(setId, cardId)?.variants.find((candidate) => candidate.id === variantId);
    return cardmarketDisplayPrice(variant?.cardmarket) ?? 0;
  };

  const folderSummaries = computed(() => collectionStore.folders.value.map((folder) => {
    const entries = collectionStore.entries.value.filter((entry) => entry.folder_id === folder.id);
    return {
      folder,
      entries: entries.length,
      cards: entries.reduce((total, entry) => total + entry.quantity, 0),
      value: entries.reduce((total, entry) => total + entry.quantity * entryValue(entry.set_id, entry.card_id, entry.variant_id), 0)
    };
  }));

  const totalCards = computed(() => folderSummaries.value.reduce((total, folder) => total + folder.cards, 0));
  const totalValue = computed(() => folderSummaries.value.reduce((total, folder) => total + folder.value, 0));

  const openCreateFolder = (): void => {
    editingFolder.value = null;
    folderName.value = '';
    showFolderDialog.value = true;
  };

  const openRenameFolder = (folder: CollectionFolder): void => {
    editingFolder.value = folder;
    folderName.value = folder.name;
    showFolderDialog.value = true;
  };

  const saveFolder = (): void => {
    if (!folderName.value.trim()) return;
    if (editingFolder.value) {
      collectionStore.renameFolder(editingFolder.value.id, folderName.value);
    } else {
      collectionStore.createFolder(folderName.value);
    }
    showFolderDialog.value = false;
  };

  const confirmDeleteFolder = (): void => {
    if (folderToDelete.value) collectionStore.deleteFolder(folderToDelete.value.id);
    folderToDelete.value = null;
  };
</script>
