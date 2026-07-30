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
          label="New collection"
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

    <section>
      <div class="row justify-end q-mb-md">
        <q-select
          v-model="collectionSort"
          :options="collectionSortOptions"
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
            <q-icon name="inventory" color="yellow-6" size="28px" />
            <div class="text-h5">Boxes</div>
            <q-badge color="grey-8">{{ boxSummaries.length }}</q-badge>
          </div>
          <div class="column q-gutter-md">
            <collection-folder-summary-card
              v-for="summary in boxSummaries"
              :key="summary.folder.id"
              v-bind="summary"
              @settings="openRenameFolder"
              @delete="openDeleteFolder"
            />
            <q-banner v-if="boxSummaries.length === 0" class="bg-grey-10 text-grey-4">
              No box collections.
            </q-banner>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <div class="row items-center q-gutter-sm q-mb-md">
            <q-icon name="auto_stories" color="yellow-6" size="28px" />
            <div class="text-h5">Binders</div>
            <q-badge color="grey-8">{{ binderSummaries.length }}</q-badge>
          </div>
          <div class="column q-gutter-md">
            <collection-folder-summary-card
              v-for="summary in binderSummaries"
              :key="summary.folder.id"
              v-bind="summary"
              :locked="binderStore.get(summary.folder.id)?.locked ?? false"
              @settings="openRenameFolder"
              @delete="openDeleteFolder"
            />
            <q-banner v-if="binderSummaries.length === 0" class="bg-grey-10 text-grey-4">
              No binder collections.
            </q-banner>
          </div>
        </div>
      </div>
    </section>

    <q-dialog v-model="showFolderDialog">
      <q-card class="bg-grey-10 text-white" style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">{{ editingFolder ? 'Collection settings' : 'Create collection' }}</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model="folderName" dark outlined autofocus label="Collection name" @keyup.enter="saveFolder" />
          <div>
            <div class="text-caption text-grey-4 q-mb-xs">Collection type</div>
            <q-btn-toggle
              v-model="folderType"
              :options="folderTypeOptions"
              color="grey-9"
              text-color="grey-4"
              toggle-color="primary"
              toggle-text-color="black"
              unelevated
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" label="Save" :disable="!folderName.trim()" @click="saveFolder" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showBinderConversionWarning" persistent>
      <q-card class="bg-grey-10 text-white" style="width: 520px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Convert this binder to a box?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            This binder contains placed cards or custom assets. Converting it to a box will permanently delete its binder layout and configuration.
          </div>
        </q-card-section>
        <q-card-section>
          <q-banner class="bg-red-10 text-white rounded-borders">
            The cards remain in the collection, but page layout, slots, proxies, and decorative images in this binder will be removed.
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Keep as binder" @click="cancelBinderConversion" />
          <q-btn color="negative" label="Convert and delete binder layout" @click="confirmBinderConversion" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <manual-card-dialog v-model="showManualCardDialog" />

    <q-dialog :model-value="folderToDelete !== null" @update:model-value="value => { if (!value) folderToDelete = null; }">
      <q-card class="bg-grey-10 text-white">
        <q-card-section>
          <div class="text-h6">Delete {{ folderToDelete?.name }}?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            <template v-if="folderDeleteEntryCount > 0 && deleteDestinationFolders.length">
              Its {{ folderDeleteEntryCount }} entries will be moved to another collection before deletion.
            </template>
            <template v-else-if="folderDeleteEntryCount > 0">
              Create another collection or move these cards before deleting this collection.
            </template>
            <template v-else>This collection is empty.</template>
          </div>
        </q-card-section>
        <q-card-section v-if="folderDeleteEntryCount > 0 && deleteDestinationFolders.length">
          <collection-folder-select
            v-model="deleteDestinationFolderId"
            :folders="deleteDestinationFolders"
            dark
            outlined
            label="Move cards to"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" @click="folderToDelete = null" />
          <q-btn
            color="negative"
            label="Delete collection"
            :disable="folderDeleteEntryCount > 0 && !deleteDestinationFolderId"
            @click="confirmDeleteFolder"
          />
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
  import CollectionFolderSummaryCard from '../components/CollectionFolderSummaryCard.vue';
  import CollectionFolderSelect from '../components/CollectionFolderSelect.vue';
  import { cardmarketDisplayPrice, formatEuroPrice } from '../utils/cardDisplay';
  import { getCardById } from '../utils/dataManagement';
  import { collectionStore } from '../utils/collection';
  import type { CollectionFolder, CollectionFolderType } from '../utils/collection';
  import { binderStore } from '../utils/binders';

  const showFolderDialog = ref(false);
  const showManualCardDialog = ref(false);
  const editingFolder = ref<CollectionFolder | null>(null);
  const folderToDelete = ref<CollectionFolder | null>(null);
  const deleteDestinationFolderId = ref('');
  const folderName = ref('');
  const folderType = ref<CollectionFolderType>('box');
  const folderTypeOptions = [
    { label: 'Box', value: 'box', icon: 'inventory' },
    { label: 'Binder', value: 'binder', icon: 'auto_stories' }
  ];
  const importFileInput = ref<HTMLInputElement | null>(null);
  const importFile = ref<File | null>(null);
  const importing = ref(false);
  const exporting = ref(false);
  const backupError = ref<string | null>(null);
  const collectionSort = ref<'name' | 'cards' | 'value'>('name');
  const collectionSortOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Card count', value: 'cards' },
    { label: 'Collection value', value: 'value' }
  ];
  const showBinderConversionWarning = ref(false);
  const pendingBinderConversion = ref<CollectionFolder | null>(null);

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
  const sortedSummaries = computed(() => [...folderSummaries.value]
    .sort((left, right) => {
      if (collectionSort.value === 'cards') return right.cards - left.cards || left.folder.name.localeCompare(right.folder.name);
      if (collectionSort.value === 'value') return right.value - left.value || left.folder.name.localeCompare(right.folder.name);
      return left.folder.name.localeCompare(right.folder.name);
    }));
  const boxSummaries = computed(() =>
    sortedSummaries.value.filter((summary) => summary.folder.type === 'box')
  );
  const binderSummaries = computed(() =>
    sortedSummaries.value.filter((summary) => summary.folder.type === 'binder')
  );

  const openCreateFolder = (): void => {
    editingFolder.value = null;
    folderName.value = '';
    folderType.value = 'box';
    showFolderDialog.value = true;
  };

  const openRenameFolder = (folder: CollectionFolder): void => {
    editingFolder.value = folder;
    folderName.value = folder.name;
    folderType.value = folder.type ?? 'binder';
    showFolderDialog.value = true;
  };

  const saveFolder = (): void => {
    if (!folderName.value.trim()) return;
    if (editingFolder.value) {
      if (editingFolder.value.type === 'binder' && folderType.value === 'box') {
        const binder = binderStore.get(editingFolder.value.id);
        const binderHasContent = Boolean(
          binder?.slots.some((slot) => slot !== null)
          || binder?.proxies.length
          || binder?.images.length
          || binder?.image_placements.length
        );
        if (binderHasContent) {
          pendingBinderConversion.value = editingFolder.value;
          showBinderConversionWarning.value = true;
          return;
        }
        binderStore.remove(editingFolder.value.id);
      }
      collectionStore.updateFolder(
        editingFolder.value.id,
        folderName.value,
        folderType.value
      );
    } else {
      collectionStore.createFolder(folderName.value, folderType.value);
    }
    showFolderDialog.value = false;
  };

  const cancelBinderConversion = (): void => {
    showBinderConversionWarning.value = false;
    pendingBinderConversion.value = null;
    folderType.value = 'binder';
  };

  const confirmBinderConversion = (): void => {
    const folder = pendingBinderConversion.value;
    if (!folder) return;
    binderStore.remove(folder.id);
    collectionStore.updateFolder(folder.id, folderName.value, 'box');
    showBinderConversionWarning.value = false;
    showFolderDialog.value = false;
    pendingBinderConversion.value = null;
    editingFolder.value = null;
  };

  const confirmDeleteFolder = (): void => {
    if (folderToDelete.value) {
      const entryIds = collectionStore.entries.value
        .filter((entry) => entry.folder_id === folderToDelete.value?.id)
        .map((entry) => entry.id);
      if (entryIds.length > 0) {
        if (!deleteDestinationFolderId.value) return;
        collectionStore.transferEntries(entryIds, deleteDestinationFolderId.value);
      }
      binderStore.remove(folderToDelete.value.id);
      collectionStore.deleteFolder(folderToDelete.value.id);
    }
    folderToDelete.value = null;
    deleteDestinationFolderId.value = '';
  };

  const folderDeleteEntryCount = computed(() => folderToDelete.value
    ? collectionStore.entries.value.filter((entry) => entry.folder_id === folderToDelete.value?.id).length
    : 0
  );
  const deleteDestinationFolders = computed(() => collectionStore.folders.value
    .filter((folder) => folder.id !== folderToDelete.value?.id)
  );

  const openDeleteFolder = (folder: CollectionFolder): void => {
    folderToDelete.value = folder;
    deleteDestinationFolderId.value = deleteDestinationFolders.value[0]?.id ?? '';
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
