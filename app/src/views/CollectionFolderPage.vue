<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section class="q-mb-lg">
      <q-btn flat dense color="grey-4" icon="arrow_back" label="Collection dashboard" no-caps to="/collection" />
      <div class="text-overline text-primary q-mt-sm">Collection folder</div>
      <div class="text-h4 text-weight-bold">{{ folder?.name ?? 'Unknown folder' }}</div>
      <div class="text-body2 text-grey-4">
        {{ cardCount }} cards · Estimated Cardmarket value {{ formatEuroPrice(folderValue) }}
      </div>
      <div class="text-caption text-grey-5 q-mt-xs">
        Values use current Cardmarket trend prices and do not adjust for card condition.
      </div>
    </section>

    <section v-if="folder" class="row q-col-gutter-md items-center q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-input v-model="search" dark dense outlined clearable debounce="150" label="Search cards by name">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-select
          v-model="selectedSort"
          :options="sortOptions"
          emit-value
          map-options
          dark
          dense
          outlined
          label="Sort by"
        />
      </div>
    </section>

    <q-banner v-if="!folder" class="bg-grey-10 text-grey-4">
      This collection folder does not exist.
    </q-banner>

    <q-banner v-else-if="collectionRows.length === 0" class="bg-grey-10 text-grey-4">
      This folder is empty. Add cards from a set, search result, or card detail page.
    </q-banner>

    <q-banner v-else-if="displayedRows.length === 0" class="bg-grey-10 text-grey-4">
      No card matches this search.
    </q-banner>

    <card-list
      v-else
      :cards="displayedRows.map((row) => row.card)"
      :collection-entries="displayedRows.map((row) => row.entry)"
      @card-click="openCard"
      @edit-entry="openEditEntryById"
      @delete-entry="setEntryToDelete"
    />

    <q-dialog v-model="showEditDialog">
      <q-card class="bg-grey-10 text-white" style="width: 460px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Edit collection card</div>
          <div class="text-body2 text-grey-4">{{ editingEntry?.card.display_name }}</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model.number="editQuantity" type="number" min="1" step="1" dark outlined label="Quantity" />
          <q-select
            v-model="editLanguageId"
            :options="editLanguageOptions"
            emit-value
            map-options
            dark
            outlined
            label="Language"
          />
          <q-select
            v-model="editCondition"
            :options="conditionOptions"
            emit-value
            map-options
            dark
            outlined
            label="Condition"
          />
          <q-select
            v-model="editFolderId"
            :options="folderOptions"
            emit-value
            map-options
            dark
            outlined
            label="Collection"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            text-color="black"
            label="Save changes"
            :disable="editQuantity < 1 || !editLanguageId || !editFolderId"
            @click="saveEntry"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="entryToDelete !== null" @update:model-value="value => { if (!value) entryToDelete = null; }">
      <q-card class="bg-grey-10 text-white">
        <q-card-section>
          <div class="text-h6">Remove this card?</div>
          <div class="text-body2 text-grey-4 q-mt-sm">
            Remove {{ entryToDelete?.entry.quantity }} × {{ entryToDelete?.card.display_name }}
            ({{ entryToDelete?.entry.condition }}) from this folder?
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" @click="entryToDelete = null" />
          <q-btn color="negative" label="Remove card" @click="confirmRemoveEntry" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import CardList from '../components/CardList.vue';
  import { buildDisplayCard, cardmarketDisplayPrice, formatEuroPrice } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { getCardById, getLanguages, getSetById } from '../utils/dataManagement';
  import { localizedValue } from '../utils/localization';
  import { cardConditions, collectionStore } from '../utils/collection';
  import type { CardCondition, CollectionEntry, CollectionFolder } from '../utils/collection';

  type CollectionRow = {
    entry: CollectionEntry;
    card: DisplayCard;
    releaseDate: string | null;
    unitPrice: number | null;
    totalValue: number;
  };
  type CollectionSort = 'name-asc' | 'release-desc' | 'release-asc' | 'price-asc' | 'price-desc';

  const sortOptions: { label: string; value: CollectionSort }[] = [
    { label: 'Name: A to Z', value: 'name-asc' },
    { label: 'Release date: newest first', value: 'release-desc' },
    { label: 'Release date: oldest first', value: 'release-asc' },
    { label: 'Price: cheapest first', value: 'price-asc' },
    { label: 'Price: most expensive first', value: 'price-desc' }
  ];

  const route = useRoute();
  const router = useRouter();
  const search = ref('');
  const selectedSort = ref<CollectionSort>('name-asc');
  const entryToDelete = ref<CollectionRow | null>(null);
  const showEditDialog = ref(false);
  const editingEntry = ref<CollectionRow | null>(null);
  const editQuantity = ref(1);
  const editLanguageId = ref('');
  const editCondition = ref<CardCondition>('NM');
  const editFolderId = ref('');
  const folderId = computed(() => String(route.params.folderId ?? ''));
  const folder = computed<CollectionFolder | null>(() =>
    collectionStore.folders.value.find((candidate) => candidate.id === folderId.value) ?? null
  );
  const folderOptions = computed(() => collectionStore.folders.value.map((candidate) => ({
    label: candidate.name,
    value: candidate.id
  })));
  const languageNames = new Map(getLanguages().map((language) => [language.id, language.name]));
  const editLanguageOptions = computed(() => {
    if (!editingEntry.value) return [];
    const set = getSetById(editingEntry.value.entry.set_id);
    const card = getCardById(editingEntry.value.entry.set_id, editingEntry.value.entry.card_id);
    const variant = card?.variants.find((candidate) => candidate.id === editingEntry.value?.entry.variant_id);
    const languageIds = variant?.language_ids?.length ? variant.language_ids : set?.language_ids ?? [];
    return languageIds.map((languageId) => ({
      label: languageNames.get(languageId) ?? languageId.toUpperCase(),
      value: languageId
    }));
  });
  const conditionOptions = cardConditions.map((entry) => ({ ...entry }));

  const collectionRows = computed<CollectionRow[]>(() => collectionStore.entries.value
    .filter((entry) => entry.folder_id === folderId.value)
    .flatMap((entry): CollectionRow[] => {
      const card = getCardById(entry.set_id, entry.card_id);
      const set = getSetById(entry.set_id);
      const variant = card?.variants.find((candidate) => candidate.id === entry.variant_id);
      if (!card || !variant) return [];
      const languageId = entry.language_id;
      const setName = set ? localizedValue(set.name, languageId) ?? set.id : null;
      const displayCard = buildDisplayCard(card, variant, languageId, setName);
      const unitPrice = cardmarketDisplayPrice(variant.cardmarket);
      return [{
        entry,
        card: displayCard,
        releaseDate: set?.release_date ?? null,
        unitPrice,
        totalValue: (unitPrice ?? 0) * entry.quantity
      }];
    }));

  const displayedRows = computed<CollectionRow[]>(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return collectionRows.value
      .filter((row) => query === '' || row.card.display_name.toLocaleLowerCase().includes(query))
      .sort((left, right) => {
        if (selectedSort.value === 'price-asc' || selectedSort.value === 'price-desc') {
          if (left.unitPrice === null && right.unitPrice !== null) return 1;
          if (left.unitPrice !== null && right.unitPrice === null) return -1;
          if (left.unitPrice !== null && right.unitPrice !== null && left.unitPrice !== right.unitPrice) {
            return selectedSort.value === 'price-asc'
              ? left.unitPrice - right.unitPrice
              : right.unitPrice - left.unitPrice;
          }
        }
        if (selectedSort.value === 'release-desc' || selectedSort.value === 'release-asc') {
          if (left.releaseDate === null && right.releaseDate !== null) return 1;
          if (left.releaseDate !== null && right.releaseDate === null) return -1;
          if (left.releaseDate !== null && right.releaseDate !== null) {
            const comparison = left.releaseDate.localeCompare(right.releaseDate);
            if (comparison !== 0) return selectedSort.value === 'release-asc' ? comparison : -comparison;
          }
        }
        return left.card.display_name.localeCompare(right.card.display_name);
      });
  });

  const cardCount = computed(() => collectionRows.value.reduce((total, row) => total + row.entry.quantity, 0));
  const folderValue = computed(() => collectionRows.value.reduce((total, row) => total + row.totalValue, 0));

  const openEditEntry = (row: CollectionRow): void => {
    editingEntry.value = row;
    editQuantity.value = row.entry.quantity;
    editLanguageId.value = row.entry.language_id;
    editCondition.value = row.entry.condition;
    editFolderId.value = row.entry.folder_id;
    showEditDialog.value = true;
  };

  const openEditEntryById = (entry: CollectionEntry): void => {
    const row = collectionRows.value.find((candidate) => candidate.entry.id === entry.id);
    if (row) openEditEntry(row);
  };

  const setEntryToDelete = (entry: CollectionEntry): void => {
    entryToDelete.value = collectionRows.value.find((candidate) => candidate.entry.id === entry.id) ?? null;
  };

  const openCard = (card: DisplayCard): void => {
    void router.push({
      path: `/set/${card.set_id}/card/${card.card_id}`,
      query: { variant: card.variant_id }
    });
  };

  const saveEntry = (): void => {
    if (!editingEntry.value || editQuantity.value < 1 || !editLanguageId.value || !editFolderId.value) return;
    collectionStore.updateEntry(editingEntry.value.entry.id, {
      folder_id: editFolderId.value,
      language_id: editLanguageId.value,
      condition: editCondition.value,
      quantity: editQuantity.value
    });
    showEditDialog.value = false;
    editingEntry.value = null;
  };

  const confirmRemoveEntry = (): void => {
    if (entryToDelete.value) collectionStore.removeEntry(entryToDelete.value.entry.id);
    entryToDelete.value = null;
  };
</script>
