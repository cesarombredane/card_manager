<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section v-if="!binder" class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col">
        <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to collection" no-caps :to="`/collection/folder/${folderId}`" />
        <div class="text-overline text-primary q-mt-sm">Binder organizer</div>
        <div class="text-h4 text-weight-bold">{{ folder?.name ?? 'Unknown collection' }}</div>
      </div>
    </section>

    <q-banner v-if="binderStore.saveError.value" class="bg-red-10 text-negative q-mb-md rounded-borders">
      {{ binderStore.saveError.value }}
    </q-banner>
    <q-banner v-if="!folder" class="bg-grey-10 text-grey-4">This collection does not exist.</q-banner>

    <div v-else-if="binder" class="row q-col-gutter-lg items-start">
      <aside class="col-12 col-lg-3">
        <div class="q-mb-md">
          <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to collection" no-caps :to="`/collection/folder/${folderId}`" />
          <div class="text-overline text-primary q-mt-sm">Binder organizer</div>
          <div class="text-h5 text-weight-bold">{{ folder.name }}</div>
          <q-btn class="q-mt-md" outline color="primary" icon="settings" label="Binder settings" no-caps @click="openSettings" />
        </div>

        <q-card flat bordered class="bg-grey-10 text-white">
          <q-card-section>
            <div class="text-h6">Collection cards</div>
            <div class="text-caption text-grey-4">Drag cards into a binder slot. Each owned copy can be placed once.</div>
            <q-input v-model="search" dark dense outlined clearable class="q-mt-md" label="Search cards">
              <template #prepend><q-icon name="search" /></template>
            </q-input>
          </q-card-section>
          <q-separator dark />
          <q-scroll-area style="height: 65vh">
            <q-list separator>
              <q-item v-for="row in availableRows" :key="row.entry.id" :draggable="row.available > 0"
                :class="{ 'text-grey-6': row.available === 0, 'cursor-grab': row.available > 0 }" @dragstart="startEntryDrag(row.entry.id, $event)">
                <q-item-section avatar>
                  <q-img v-if="row.card.image_url" :src="row.card.image_url" fit="contain" width="54px" height="74px" />
                  <q-icon v-else name="style" size="38px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ row.card.display_name }}</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    {{ row.card.set_name }} · {{ row.entry.language_id.toUpperCase() }} · {{ row.entry.condition }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="row.available > 0 ? 'primary' : 'grey-8'" :text-color="row.available > 0 ? 'black' : 'white'">
                    {{ row.available }} / {{ row.entry.quantity }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-card>
      </aside>

      <section class="col-12 col-lg-9">
        <div class="row items-center justify-between q-mb-md">
          <q-btn flat round icon="chevron_left" :disable="currentSpread === 0" @click="currentSpread--" />
          <div class="text-subtitle1 text-weight-bold">{{ spreadLabel }}</div>
          <q-btn flat round icon="chevron_right" :disable="currentSpread >= binder.page_count" @click="currentSpread++" />
        </div>

        <div class="binder-spread">
          <div v-for="side in visibleSides" :key="side.position" class="binder-leaf">
            <div class="text-caption text-grey-4 text-center q-mb-xs">{{ side.label }}</div>
            <div v-if="side.sideIndex !== null" class="binder-page q-pa-sm rounded-borders" :style="{ gridTemplateColumns: `repeat(${binderColumns}, minmax(0, 1fr))` }">
              <div v-for="slot in side.slots" :key="slot.index" class="binder-slot relative-position" :class="{ 'binder-slot--filled': slot.row }" @dragover.prevent
                @drop.prevent="dropOnSlot(slot.index, $event)">
                <template v-if="slot.row">
                  <img v-if="slot.row.card.image_url" :src="slot.row.card.image_url" :alt="slot.row.card.display_name" draggable="true"
                    @dragstart="startSlotDrag(slot.index, $event)" />
                  <div v-else class="full-height column items-center justify-center text-center q-pa-sm" draggable="true" @dragstart="startSlotDrag(slot.index, $event)">
                    <q-icon name="style" size="30px" color="grey-5" />
                    <div class="text-caption q-mt-sm">{{ slot.row.card.display_name }}</div>
                  </div>
                  <q-btn class="slot-remove absolute-top-right q-ma-xs" round dense size="xs" color="grey-10" icon="close"
                    @click="binderStore.setSlot(folderId, slot.index, null)">
                    <q-tooltip>Remove from binder</q-tooltip>
                  </q-btn>
                </template>
                <div v-else class="full-height column items-center justify-center text-grey-6">
                  <q-icon name="add" size="24px" />
                  <span class="text-caption">Drop here</span>
                </div>
              </div>
            </div>
            <div v-else class="binder-page binder-page--empty rounded-borders column items-center justify-center text-grey-7">
              <q-icon name="menu_book" size="42px" />
              <span class="text-caption q-mt-sm">No page</span>
            </div>
          </div>
        </div>
      </section>

    </div>

    <q-dialog :model-value="showCreateDialog" persistent>
      <q-card class="bg-grey-10 text-white" style="width: 440px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Create binder</div>
          <div class="text-body2 text-grey-4">One binder can be created for this collection.</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model.number="newPageCount" type="number" min="1" max="200" dark outlined label="Number of pages" />
          <q-select v-model="newLayout" :options="layoutOptions" emit-value map-options dark outlined label="Cards per page" />
          <q-banner class="bg-grey-9 text-grey-4 rounded-borders">
            Capacity: {{ newPageCount * 2 * binderSlotsPerPage(newLayout) }} cards
            (recto and verso)
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" :to="`/collection/folder/${folderId}`" />
          <q-btn color="primary" text-color="black" label="Create binder" :disable="newPageCount < 1" @click="createBinder" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showSettings">
      <q-card class="bg-grey-10 text-white" style="width: 460px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Binder settings</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model.number="settingsPageCount" type="number" min="1" max="200" dark outlined label="Number of pages" />
          <q-select v-model="settingsLayout" :options="layoutOptions" emit-value map-options dark outlined label="Cards per page" />
          <q-banner class="bg-grey-9 text-grey-4 rounded-borders">
            New capacity: {{ settingsPageCount * 2 * binderSlotsPerPage(settingsLayout) }} cards
            (recto and verso)
          </q-banner>
          <q-banner v-if="settingsChanged" class="bg-red-10 text-white rounded-borders">
            <template #avatar><q-icon name="warning" color="white" /></template>
            Changing these settings will reset the binder and permanently remove every card from its current slot.
            Cards will remain safely in the collection.
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="negative" :label="settingsChanged ? 'Reset and save' : 'Save'" :disable="settingsPageCount < 1 || !settingsChanged" @click="saveSettings" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  import { computed, ref, watchEffect } from 'vue';
  import { useRoute } from 'vue-router';
  import { binderSlotsPerPage, binderStore } from '../utils/binders';
  import type { BinderLayout } from '../utils/binders';
  import { collectionStore } from '../utils/collection';
  import type { CollectionEntry } from '../utils/collection';
  import { buildDisplayCard } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { getCardById, getSetById } from '../utils/dataManagement';
  import { localizedValue } from '../utils/localization';
  import { resolveCardImage } from '../utils/cardImages';

  type BinderRow = { entry: CollectionEntry; card: DisplayCard; available: number; };

  const route = useRoute();
  const folderId = computed(() => String(route.params.folderId ?? ''));
  const folder = computed(() => collectionStore.folders.value.find((candidate) => candidate.id === folderId.value) ?? null);
  const binder = computed(() => binderStore.get(folderId.value));
  const showCreateDialog = computed(() => Boolean(folder.value && binderStore.isReady.value && !binder.value));
  const showSettings = ref(false);
  const newPageCount = ref(20);
  const newLayout = ref<BinderLayout>('3x3');
  const settingsPageCount = ref(1);
  const settingsLayout = ref<BinderLayout>('3x3');
  const currentSpread = ref(0);
  const search = ref('');
  const layoutOptions = [
    { label: '2 × 2 — 4 cards per page', value: '2x2' },
    { label: '3 × 3 — 9 cards per page', value: '3x3' }
  ];

  const cardForEntry = (entry: CollectionEntry): DisplayCard | null => {
    if (entry.set_id === 'manual-collection') {
      const manual = collectionStore.manualCards.value.find((card) => card.id === entry.card_id);
      if (!manual) return null;
      const image = resolveCardImage({}, entry.language_id, entry.language_id, {
        setId: 'manual-collection', cardId: manual.id, variantId: entry.variant_id
      });
      return {
        id: manual.id, card_id: manual.id, set_id: entry.set_id, set_name: manual.set_name || null,
        language_id: entry.language_id, variant_id: entry.variant_id, number: manual.number || '?',
        display_name: manual.name, category: manual.category, rarity: manual.rarity, hp: manual.hp,
        illustrator: manual.illustrator || null, types: manual.types,
        pokemon_names: manual.pokemon_name ? [manual.pokemon_name] : [], energy_costs: [],
        image_url: image.url, image_language_id: image.languageId, image_is_fallback: false,
        image_source: image.source, cardmarket: null, is_manual: true, estimated_value: manual.estimated_value
      };
    }
    const card = getCardById(entry.set_id, entry.card_id);
    const set = getSetById(entry.set_id);
    const variant = card?.variants.find((candidate) => candidate.id === entry.variant_id);
    if (!card || !variant) return null;
    return buildDisplayCard(card, variant, entry.language_id, set ? localizedValue(set.name, entry.language_id) ?? set.id : null);
  };

  const baseRows = computed(() => collectionStore.entries.value
    .filter((entry) => entry.folder_id === folderId.value)
    .flatMap((entry): Array<Omit<BinderRow, 'available'>> => {
      const card = cardForEntry(entry);
      return card ? [{ entry, card }] : [];
    }));
  const usedCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const entryId of binder.value?.slots ?? []) {
      if (entryId) counts.set(entryId, (counts.get(entryId) ?? 0) + 1);
    }
    return counts;
  });
  const rows = computed<BinderRow[]>(() => baseRows.value.map((row) => ({
    ...row,
    available: Math.max(0, row.entry.quantity - (usedCounts.value.get(row.entry.id) ?? 0))
  })));
  const availableRows = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return rows.value.filter((row) =>
      !query || row.card.display_name.toLocaleLowerCase().includes(query) || row.card.set_name?.toLocaleLowerCase().includes(query)
    );
  });
  const binderColumns = computed(() => binder.value?.layout === '2x2' ? 2 : 3);
  const settingsChanged = computed(() =>
    Boolean(binder.value && (
      settingsPageCount.value !== binder.value.page_count
      || settingsLayout.value !== binder.value.layout
    ))
  );
  const slotsForSide = (sideIndex: number) => {
    if (!binder.value) return [];
    const count = binderSlotsPerPage(binder.value.layout);
    const start = sideIndex * count;
    return binder.value.slots.slice(start, start + count).map((entryId, offset) => ({
      index: start + offset,
      row: entryId ? rows.value.find((row) => row.entry.id === entryId) ?? null : null
    }));
  };
  const visibleSides = computed(() => {
    const pageCount = binder.value?.page_count ?? 0;
    const leftSideIndex = currentSpread.value === 0 ? null : currentSpread.value * 2 - 1;
    const rightSideIndex = currentSpread.value >= pageCount ? null : currentSpread.value * 2;
    return [
      {
        position: 'left',
        sideIndex: leftSideIndex,
        label: leftSideIndex === null ? '' : `Page ${currentSpread.value}`,
        slots: leftSideIndex === null ? [] : slotsForSide(leftSideIndex)
      },
      {
        position: 'right',
        sideIndex: rightSideIndex,
        label: rightSideIndex === null ? '' : `Page ${currentSpread.value + 1}`,
        slots: rightSideIndex === null ? [] : slotsForSide(rightSideIndex)
      }
    ];
  });
  const spreadLabel = computed(() => {
    const pageCount = binder.value?.page_count ?? 0;
    if (currentSpread.value === 0) return 'Page 1';
    if (currentSpread.value === pageCount) return `Page ${pageCount}`;
    return `Pages ${currentSpread.value}–${currentSpread.value + 1}`;
  });

  watchEffect(() => {
    const quantities = new Map(baseRows.value.map((row) => [row.entry.id, row.entry.quantity]));
    binderStore.clean(folderId.value, quantities);
    if (binder.value && currentSpread.value > binder.value.page_count) {
      currentSpread.value = binder.value.page_count;
    }
  });

  const createBinder = (): void => {
    binderStore.create(folderId.value, newPageCount.value, newLayout.value);
  };
  const openSettings = (): void => {
    if (!binder.value) return;
    settingsPageCount.value = binder.value.page_count;
    settingsLayout.value = binder.value.layout;
    showSettings.value = true;
  };
  const saveSettings = (): void => {
    if (!settingsChanged.value || settingsPageCount.value < 1) return;
    binderStore.resetSettings(folderId.value, settingsPageCount.value, settingsLayout.value);
    currentSpread.value = 0;
    showSettings.value = false;
  };
  const startEntryDrag = (entryId: string, event: DragEvent): void => {
    const row = rows.value.find((candidate) => candidate.entry.id === entryId);
    if (!row || row.available < 1 || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `entry:${entryId}`);
    event.dataTransfer.effectAllowed = 'copy';
  };
  const startSlotDrag = (slotIndex: number, event: DragEvent): void => {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', `slot:${slotIndex}`);
    event.dataTransfer.effectAllowed = 'move';
  };
  const dropOnSlot = (targetIndex: number, event: DragEvent): void => {
    const payload = event.dataTransfer?.getData('text/plain') ?? '';
    if (payload.startsWith('slot:')) {
      binderStore.moveSlot(folderId.value, Number(payload.slice(5)), targetIndex);
      return;
    }
    if (payload.startsWith('entry:')) {
      const entryId = payload.slice(6);
      const row = rows.value.find((candidate) => candidate.entry.id === entryId);
      if (row && row.available > 0) binderStore.setSlot(folderId.value, targetIndex, entryId);
    }
  };
</script>

<style scoped>
  .binder-spread {
    display: grid;
    width: min(100%, calc((100dvh - 190px) * 16 / 11));
    margin-inline: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-items: end;
    padding: 12px;
    border-radius: 10px;
    background: #101010;
    box-shadow: inset 0 0 18px rgb(0 0 0 / 70%);
  }

  .binder-leaf {
    min-width: 0;
  }

  .binder-page {
    display: grid;
    gap: 7px;
    border: 7px solid #171717;
    background: #272727;
    box-shadow: inset 0 0 0 2px rgb(255 255 255 / 6%);
  }

  .binder-page--empty {
    display: flex;
    aspect-ratio: 8 / 11;
    border-style: dashed;
    background: #161616;
  }

  .binder-slot {
    aspect-ratio: 8 / 11;
    overflow: hidden;
    border: 2px dashed #616161;
    border-radius: 8px;
    background: #151515;
  }

  .binder-slot--filled {
    border-style: solid;
    border-color: #424242;
  }

  .binder-slot img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    cursor: grab;
  }

  .slot-remove {
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .binder-slot:hover .slot-remove,
  .binder-slot:focus-within .slot-remove {
    opacity: 1;
  }

  .cursor-grab {
    cursor: grab;
  }

  @media (hover: none) {
    .slot-remove {
      opacity: 1;
    }
  }
</style>
