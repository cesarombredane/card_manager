<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div>
        <div class="text-overline text-primary">My collection</div>
        <div class="text-h4 text-weight-bold">Collection dashboard</div>
        <div class="text-body2 text-grey-4">
          {{ totalCards }} cards · Estimated collection value {{ formatEuroPrice(totalValue) }}
        </div>
      </div>
      <div class="col-auto row q-gutter-sm">
        <q-btn
          flat
          color="grey-3"
          icon="download"
          label="Export"
          no-caps
          :loading="exporting"
          @click="exportPersonalData"
        />
        <q-btn
          flat
          color="grey-3"
          icon="upload"
          label="Import"
          no-caps
          :disable="importing"
          @click="importFileInput?.click()"
        />
        <input ref="importFileInput" type="file" accept=".zip,application/zip" hidden @change="selectImportFile" />
        <q-btn
          outline
          color="primary"
          icon="add_photo_alternate"
          label="Add manual card"
          no-caps
          :disable="!collectionStore.isFileConnected.value"
          @click="showManualCardDialog = true"
        />
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
                  {{ summary.cards }} owned cards · {{ summary.wanted }} wanted · {{ summary.entries }} owned entries
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

    <manual-card-dialog v-model="showManualCardDialog" />

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

    <q-dialog :model-value="importFile !== null" persistent>
      <q-card class="bg-grey-10 text-white" style="width: 520px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Import personal data?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">{{ importFile?.name }}</div>
        </q-card-section>
        <q-card-section>
          <q-banner class="bg-red-10 text-white rounded-borders">
            <template #avatar><q-icon name="warning" color="white" /></template>
            This will permanently replace every collection, binder, manual card, proxy, decorative image, and personal card image currently stored in Card Manager.
          </q-banner>
          <div v-if="backupError" class="text-negative q-mt-md">{{ backupError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" :disable="importing" @click="cancelImport" />
          <q-btn color="negative" label="Overwrite and import" :loading="importing" @click="importPersonalData" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-banner v-if="backupError && !importFile" class="bg-red-10 text-white q-mt-lg rounded-borders">
      {{ backupError }}
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import ManualCardDialog from '../components/ManualCardDialog.vue';
  import { cardmarketDisplayPrice, formatEuroPrice } from '../utils/cardDisplay';
  import { getCardById } from '../utils/dataManagement';
  import { collectionStore, mainFolderId } from '../utils/collection';
  import type { CollectionFolder } from '../utils/collection';
  import { binderStore } from '../utils/binders';

  const showFolderDialog = ref(false);
  const showManualCardDialog = ref(false);
  const editingFolder = ref<CollectionFolder | null>(null);
  const folderToDelete = ref<CollectionFolder | null>(null);
  const folderName = ref('');
  const importFileInput = ref<HTMLInputElement | null>(null);
  const importFile = ref<File | null>(null);
  const importing = ref(false);
  const exporting = ref(false);
  const backupError = ref<string | null>(null);

  const entryValue = (setId: string, cardId: string, variantId: string): number => {
    if (setId === 'manual-collection') {
      return collectionStore.manualCards.value.find((card) => card.id === cardId)?.estimated_value ?? 0;
    }
    const variant = getCardById(setId, cardId)?.variants.find((candidate) => candidate.id === variantId);
    return cardmarketDisplayPrice(variant?.cardmarket) ?? 0;
  };

  const folderSummaries = computed(() => collectionStore.folders.value.map((folder) => {
    const folderEntries = collectionStore.entries.value.filter((entry) => entry.folder_id === folder.id);
    const entries = folderEntries.filter((entry) => !entry.wanted);
    return {
      folder,
      entries: entries.length,
      cards: entries.reduce((total, entry) => total + entry.quantity, 0),
      wanted: folderEntries
        .filter((entry) => entry.wanted)
        .reduce((total, entry) => total + entry.quantity, 0),
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
    if (folderToDelete.value) {
      binderStore.remove(folderToDelete.value.id);
      collectionStore.deleteFolder(folderToDelete.value.id);
    }
    folderToDelete.value = null;
  };

  const responseError = async (response: Response, fallback: string): Promise<string> => {
    try {
      const body = await response.json() as { error?: string };
      return body.error ?? fallback;
    } catch {
      return fallback;
    }
  };

  const exportPersonalData = async (): Promise<void> => {
    exporting.value = true;
    backupError.value = null;
    try {
      const response = await fetch('/api/personal-data/export');
      if (!response.ok) throw new Error(await responseError(response, 'Unable to export personal data'));
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') ?? '';
      const filename = /filename="([^"]+)"/.exec(contentDisposition)?.[1] ?? 'card-manager-backup.zip';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      backupError.value = error instanceof Error ? error.message : String(error);
    } finally {
      exporting.value = false;
    }
  };

  const selectImportFile = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    importFile.value = input.files?.[0] ?? null;
    backupError.value = null;
  };

  const cancelImport = (): void => {
    importFile.value = null;
    if (importFileInput.value) importFileInput.value.value = '';
    backupError.value = null;
  };

  const importPersonalData = async (): Promise<void> => {
    if (!importFile.value) return;
    importing.value = true;
    backupError.value = null;
    try {
      const response = await fetch('/api/personal-data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/zip' },
        body: importFile.value
      });
      if (!response.ok) throw new Error(await responseError(response, 'Unable to import personal data'));
      window.location.reload();
    } catch (error) {
      backupError.value = error instanceof Error ? error.message : String(error);
      importing.value = false;
    }
  };
</script>
