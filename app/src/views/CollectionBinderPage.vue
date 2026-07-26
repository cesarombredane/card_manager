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
            <div class="row items-center justify-between">
              <div class="text-h6">Binder items</div>
              <q-btn v-if="selectorTab !== 'collection'" flat round dense color="primary" icon="add" @click="openAssetDialog(selectorTab)">
                <q-tooltip>Add {{ selectorTab === 'proxies' ? 'proxy' : 'image' }}</q-tooltip>
              </q-btn>
            </div>
            <q-tabs v-model="selectorTab" dense active-color="primary" indicator-color="primary" class="q-mt-sm">
              <q-tab name="collection" label="Cards" />
              <q-tab name="proxies" label="Proxies" />
              <q-tab name="images" label="Images" />
            </q-tabs>
            <div class="text-caption text-grey-4 q-mt-sm">{{ selectorHelp }}</div>
            <q-input v-model="search" dark dense outlined clearable class="q-mt-sm" label="Search">
              <template #prepend><q-icon name="search" /></template>
            </q-input>
            <card-sort-selector v-if="selectorTab === 'collection'" v-model="selectedCardSort" class="q-mt-sm" />
          </q-card-section>
          <q-separator dark />
          <q-scroll-area style="height: 50vh">
            <q-list v-if="selectorTab === 'collection'" separator>
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
            <q-list v-else-if="selectorTab === 'proxies'" separator>
              <q-item v-for="proxy in filteredProxies" :key="proxy.id" :draggable="proxyAvailable(proxy) > 0"
                :class="{ 'text-grey-6': proxyAvailable(proxy) === 0, 'cursor-grab': proxyAvailable(proxy) > 0 }" @dragstart="startProxyDrag(proxy.id, $event)">
                <q-item-section avatar>
                  <q-img :src="binderAssetUrl(proxy.id, 'proxy')" fit="contain" width="54px" height="74px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ proxy.name }}</q-item-label>
                  <q-item-label caption>{{ proxyAvailable(proxy) }} / {{ proxy.quantity }} available</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat round dense color="negative" icon="delete" @click="deleteAsset('proxy', proxy.id)" />
                </q-item-section>
              </q-item>
              <q-item v-if="filteredProxies.length === 0"><q-item-section class="text-grey-5">No proxies. Use + to upload one.</q-item-section></q-item>
            </q-list>
            <q-list v-else separator>
              <q-item v-for="image in filteredImages" :key="image.id" draggable="true" class="cursor-grab" @dragstart="startImageDrag(image.id, $event)">
                <q-item-section avatar>
                  <q-img :src="binderAssetUrl(image.id, 'image')" fit="contain" width="64px" height="64px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ image.name }}</q-item-label>
                  <q-item-label caption>{{ image.width }} × {{ image.height }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row no-wrap">
                    <q-btn v-if="placedImageIds.has(image.id)" flat round dense color="grey-4" icon="remove_circle"
                      @click="binderStore.removeImagePlacement(folderId, image.id)">
                      <q-tooltip>Remove from binder page</q-tooltip>
                    </q-btn>
                    <q-btn flat round dense color="negative" icon="delete" @click="deleteAsset('image', image.id)" />
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="filteredImages.length === 0"><q-item-section class="text-grey-5">No images. Use + to upload one.</q-item-section></q-item>
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
              <div v-for="decoration in side.decorations" :key="decoration.image.id" class="binder-decoration" :style="{
                gridColumn: `${decoration.placement.column + 1} / span ${decoration.image.width}`,
                gridRow: `${decoration.placement.row + 1} / span ${decoration.image.height}`
              }">
                <img :src="binderAssetUrl(decoration.image.id, 'image')" :alt="decoration.image.name" />
              </div>
              <div v-for="slot in side.slots" :key="slot.index" class="binder-slot relative-position"
                :class="{ 'binder-slot--filled': slot.content, 'binder-slot--decorated': slot.hasDecoration && !slot.content }"
                :style="{ gridColumn: slot.column + 1, gridRow: slot.rowIndex + 1 }" @dragover.prevent @drop.prevent="dropOnSlot(slot.index, $event)">
                <template v-if="slot.content">
                  <img v-if="slot.content.imageUrl" :src="slot.content.imageUrl" :alt="slot.content.name" draggable="true"
                    @dragstart="startSlotDrag(slot.index, $event)" />
                  <div v-else class="full-height column items-center justify-center text-center q-pa-sm" draggable="true" @dragstart="startSlotDrag(slot.index, $event)">
                    <q-icon name="style" size="30px" color="grey-5" />
                    <div class="text-caption q-mt-sm">{{ slot.content.name }}</div>
                  </div>
                  <q-btn class="slot-remove absolute-top-right q-ma-xs" round dense size="xs" color="grey-10" icon="close"
                    @click="binderStore.setSlot(folderId, slot.index, null)">
                    <q-tooltip>Remove from binder</q-tooltip>
                  </q-btn>
                </template>
                <div v-else-if="!slot.hasDecoration" class="full-height column items-center justify-center text-grey-6">
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

    <q-dialog v-model="showAssetDialog">
      <q-card class="bg-grey-10 text-white" style="width: 500px; max-width: 92vw">
        <q-card-section>
          <div class="text-h6">Add {{ assetKind === 'proxy' ? 'proxy card' : 'binder image' }}</div>
          <div class="text-body2 text-grey-4">
            {{
              assetKind === 'proxy'
                ? 'A proxy occupies one card slot and does not enter your collection.'
                : 'The image sits behind slots, so cards can be placed on top.'
            }}
          </div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model="assetName" dark outlined :label="assetKind === 'proxy' ? 'Proxy name' : 'Image name'" />
          <q-input v-if="assetKind === 'proxy'" v-model.number="assetQuantity" type="number" min="1" step="1" dark outlined label="Quantity" />
          <div v-if="assetKind === 'image'">
            <div class="row q-gutter-md no-wrap items-start">
              <div class="col">
                <q-select class="full-width" v-model="assetWidth" :options="assetDimensions" dark outlined label="Width in slots" />
              </div>
              <div class="col">
                <q-select class="full-width" v-model="assetHeight" :options="assetDimensions" dark outlined label="Height in slots" />
              </div>
            </div>
          </div>
          <q-file v-model="assetFile" dark outlined accept="image/jpeg,image/png,image/webp" label="Choose image" @update:model-value="prepareAssetImage">
            <template #prepend><q-icon name="image" /></template>
          </q-file>
          <q-img v-if="assetPreview" :src="assetPreview" fit="contain" class="bg-grey-9 rounded-borders" style="max-height: 360px" />
          <div v-if="assetError" class="text-negative">{{ assetError }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn color="primary" text-color="black" label="Add" :disable="!assetName.trim() || !assetDataUrl || (assetKind === 'proxy' && assetQuantity < 1)"
            :loading="assetSaving" @click="saveAsset" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  import { computed, ref, watchEffect } from 'vue';
  import { useRoute } from 'vue-router';
  import { binderSlotsPerPage, binderStore } from '../utils/binders';
  import type { BinderLayout, BinderProxy } from '../utils/binders';
  import { collectionStore } from '../utils/collection';
  import type { CollectionEntry } from '../utils/collection';
  import { buildDisplayCard } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { getCardById, getPokemon, getSetById } from '../utils/dataManagement';
  import { localizedValue } from '../utils/localization';
  import { resolveCardImage } from '../utils/cardImages';
  import { manualImageStore } from '../utils/manualImages';
  import CardSortSelector from '../components/CardSortSelector.vue';
  import type { CardSort } from '../utils/cardSorting';
  import { cardmarketDisplayPrice } from '../utils/cardDisplay';

  type BinderRow = {
    entry: CollectionEntry;
    card: DisplayCard;
    available: number;
    releaseDate: string | null;
    pokedexNumber: number | null;
    price: number | null;
  };
  type SelectorTab = 'collection' | 'proxies' | 'images';

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
  const selectedCardSort = ref<CardSort>('release-desc');
  const selectorTab = ref<SelectorTab>('collection');
  const showAssetDialog = ref(false);
  const assetKind = ref<'proxy' | 'image'>('proxy');
  const assetName = ref('');
  const assetQuantity = ref(1);
  const assetWidth = ref(1);
  const assetHeight = ref(1);
  const assetFile = ref<File | null>(null);
  const assetDataUrl = ref<string | null>(null);
  const assetPreview = ref<string | null>(null);
  const assetError = ref<string | null>(null);
  const assetSaving = ref(false);
  const layoutOptions = [
    { label: '2 × 2 — 4 cards per page', value: '2x2' },
    { label: '3 × 3 — 9 cards per page', value: '3x3' }
  ];
  const pokemon = getPokemon();
  const pokedexByPokemonId = new Map(pokemon.map((entry) => [entry.id, entry.pokedex_id]));
  const pokedexByPokemonName = new Map(pokemon.flatMap((entry) =>
    [entry.name, ...Object.values(entry.names).filter((name): name is string => Boolean(name))]
      .map((name) => [name.toLocaleLowerCase(), entry.pokedex_id] as const)
  ));

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
      if (!card) return [];
      const manual = entry.set_id === 'manual-collection'
        ? collectionStore.manualCards.value.find((candidate) => candidate.id === entry.card_id)
        : null;
      const set = entry.set_id === 'manual-collection' ? null : getSetById(entry.set_id);
      const pokedexNumbers = card.pokemon_names
        .map((pokemonId) => pokedexByPokemonId.get(pokemonId))
        .filter((number): number is number => number !== undefined);
      return [{
        entry,
        card,
        releaseDate: manual?.release_date ?? set?.release_date ?? null,
        pokedexNumber: pokedexNumbers.length
          ? Math.min(...pokedexNumbers)
          : manual?.pokemon_name
            ? pokedexByPokemonName.get(manual.pokemon_name.toLocaleLowerCase()) ?? null
            : null,
        price: manual?.estimated_value ?? cardmarketDisplayPrice(card.cardmarket)
      }];
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
    return rows.value
      .filter((row) =>
        !query || row.card.display_name.toLocaleLowerCase().includes(query) || row.card.set_name?.toLocaleLowerCase().includes(query)
      )
      .sort((left, right) => {
        if (selectedCardSort.value === 'pokedex-asc' || selectedCardSort.value === 'pokedex-desc') {
          if (left.pokedexNumber === null && right.pokedexNumber !== null) return 1;
          if (left.pokedexNumber !== null && right.pokedexNumber === null) return -1;
          if (left.pokedexNumber !== null && right.pokedexNumber !== null && left.pokedexNumber !== right.pokedexNumber) {
            return selectedCardSort.value === 'pokedex-asc'
              ? left.pokedexNumber - right.pokedexNumber
              : right.pokedexNumber - left.pokedexNumber;
          }
        }
        if (selectedCardSort.value === 'price-asc' || selectedCardSort.value === 'price-desc') {
          if (left.price === null && right.price !== null) return 1;
          if (left.price !== null && right.price === null) return -1;
          if (left.price !== null && right.price !== null && left.price !== right.price) {
            return selectedCardSort.value === 'price-asc' ? left.price - right.price : right.price - left.price;
          }
        }
        if (left.releaseDate === null && right.releaseDate !== null) return 1;
        if (left.releaseDate !== null && right.releaseDate === null) return -1;
        if (left.releaseDate && right.releaseDate && left.releaseDate !== right.releaseDate) {
          return selectedCardSort.value === 'release-asc'
            ? left.releaseDate.localeCompare(right.releaseDate)
            : right.releaseDate.localeCompare(left.releaseDate);
        }
        return left.card.display_name.localeCompare(right.card.display_name);
      });
  });
  const binderColumns = computed(() => binder.value?.layout === '2x2' ? 2 : 3);
  const assetDimensions = computed(() => Array.from({ length: binderColumns.value }, (_, index) => index + 1));
  const selectorHelp = computed(() => ({
    collection: 'Drag owned cards into slots. Each copy can be placed once.',
    proxies: 'Upload custom proxy cards and place each one in a card slot.',
    images: 'Upload background images that can span several slots.'
  }[selectorTab.value]));
  const usedProxyCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const slot of binder.value?.slots ?? []) {
      if (!slot?.startsWith('proxy:')) continue;
      const proxyId = slot.slice(6);
      counts.set(proxyId, (counts.get(proxyId) ?? 0) + 1);
    }
    return counts;
  });
  const proxyAvailable = (proxy: BinderProxy): number =>
    Math.max(0, proxy.quantity - (usedProxyCounts.value.get(proxy.id) ?? 0));
  const placedImageIds = computed(() => new Set((binder.value?.image_placements ?? []).map((placement) => placement.image_id)));
  const filteredProxies = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return (binder.value?.proxies ?? []).filter((proxy) => !query || proxy.name.toLocaleLowerCase().includes(query));
  });
  const filteredImages = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return (binder.value?.images ?? []).filter((image) => !query || image.name.toLocaleLowerCase().includes(query));
  });
  const settingsChanged = computed(() =>
    Boolean(binder.value && (
      settingsPageCount.value !== binder.value.page_count
      || settingsLayout.value !== binder.value.layout
    ))
  );
  const binderAssetUrl = (assetId: string, kind: 'proxy' | 'image'): string => {
    const asset = manualImageStore.find('binder-assets', folderId.value, assetId, kind);
    return asset ? `${asset.url}?v=${encodeURIComponent(asset.updated_at)}` : '';
  };
  const slotContent = (slotValue: string | null): { name: string; imageUrl: string | null; } | null => {
    if (!slotValue) return null;
    if (slotValue.startsWith('proxy:')) {
      const proxyId = slotValue.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
      return proxy ? { name: proxy.name, imageUrl: binderAssetUrl(proxy.id, 'proxy') } : null;
    }
    const row = rows.value.find((candidate) => candidate.entry.id === slotValue);
    return row ? { name: row.card.display_name, imageUrl: row.card.image_url } : null;
  };
  const slotsForSide = (sideIndex: number) => {
    if (!binder.value) return [];
    const count = binderSlotsPerPage(binder.value.layout);
    const start = sideIndex * count;
    return binder.value.slots.slice(start, start + count).map((entryId, offset) => {
      const rowIndex = Math.floor(offset / binderColumns.value);
      const column = offset % binderColumns.value;
      const hasDecoration = binder.value?.image_placements.some((placement) => {
        if (placement.side_index !== sideIndex) return false;
        const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
        return Boolean(
          image
          && rowIndex >= placement.row
          && rowIndex < placement.row + image.height
          && column >= placement.column
          && column < placement.column + image.width
        );
      }) ?? false;
      return {
        index: start + offset,
        rowIndex,
        column,
        hasDecoration,
        content: slotContent(entryId)
      };
    });
  };
  const decorationsForSide = (sideIndex: number) => {
    if (!binder.value) return [];
    return binder.value.image_placements
      .filter((placement) => placement.side_index === sideIndex)
      .flatMap((placement) => {
        const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
        return image ? [{ placement, image }] : [];
      });
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
        slots: leftSideIndex === null ? [] : slotsForSide(leftSideIndex),
        decorations: leftSideIndex === null ? [] : decorationsForSide(leftSideIndex)
      },
      {
        position: 'right',
        sideIndex: rightSideIndex,
        label: rightSideIndex === null ? '' : `Page ${currentSpread.value + 1}`,
        slots: rightSideIndex === null ? [] : slotsForSide(rightSideIndex),
        decorations: rightSideIndex === null ? [] : decorationsForSide(rightSideIndex)
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
    if (!binderStore.isReady.value || !collectionStore.isFileConnected.value || !binder.value) return;
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
  const openAssetDialog = (tab: SelectorTab): void => {
    assetKind.value = tab === 'images' ? 'image' : 'proxy';
    assetName.value = '';
    assetQuantity.value = 1;
    assetWidth.value = 1;
    assetHeight.value = 1;
    assetFile.value = null;
    assetDataUrl.value = null;
    assetPreview.value = null;
    assetError.value = null;
    showAssetDialog.value = true;
  };
  const prepareAssetImage = (file: File | null): void => {
    assetDataUrl.value = null;
    assetPreview.value = null;
    assetError.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      assetError.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      assetDataUrl.value = typeof reader.result === 'string' ? reader.result : null;
      assetPreview.value = assetDataUrl.value;
    };
    reader.onerror = () => { assetError.value = 'Unable to read the selected image.'; };
    reader.readAsDataURL(file);
  };
  const saveAsset = async (): Promise<void> => {
    if (!binder.value || !assetName.value.trim() || !assetDataUrl.value) return;
    assetSaving.value = true;
    assetError.value = null;
    const asset = assetKind.value === 'proxy'
      ? binderStore.createProxy(folderId.value, assetName.value, assetQuantity.value)
      : binderStore.createImage(folderId.value, assetName.value, assetWidth.value, assetHeight.value);
    try {
      await manualImageStore.upload({
        set_id: 'binder-assets',
        card_id: folderId.value,
        variant_id: asset.id,
        language_id: assetKind.value,
        data_url: assetDataUrl.value
      });
      showAssetDialog.value = false;
    } catch (error) {
      binderStore.removeAsset(folderId.value, assetKind.value, asset.id);
      assetError.value = error instanceof Error ? error.message : String(error);
    } finally {
      assetSaving.value = false;
    }
  };
  const deleteAsset = async (kind: 'proxy' | 'image', assetId: string): Promise<void> => {
    binderStore.removeAsset(folderId.value, kind, assetId);
    await manualImageStore.remove('binder-assets', folderId.value, assetId, kind).catch(() => undefined);
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
  const startProxyDrag = (proxyId: string, event: DragEvent): void => {
    const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
    if (!proxy || proxyAvailable(proxy) < 1 || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `proxy:${proxyId}`);
    event.dataTransfer.effectAllowed = 'copy';
  };
  const startImageDrag = (imageId: string, event: DragEvent): void => {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', `image:${imageId}`);
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
      return;
    }
    if (payload.startsWith('proxy:')) {
      const proxyId = payload.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxyId);
      if (proxy && proxyAvailable(proxy) > 0) binderStore.setSlot(folderId.value, targetIndex, `proxy:${proxyId}`);
      return;
    }
    if (payload.startsWith('image:') && binder.value) {
      const imageId = payload.slice(6);
      const count = binderSlotsPerPage(binder.value.layout);
      const sideIndex = Math.floor(targetIndex / count);
      const localIndex = targetIndex % count;
      binderStore.placeImage(
        folderId.value,
        imageId,
        sideIndex,
        Math.floor(localIndex / binderColumns.value),
        localIndex % binderColumns.value
      );
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
    z-index: 2;
    aspect-ratio: 8 / 11;
    overflow: hidden;
    border: 2px dashed #616161;
    border-radius: 8px;
    background: rgb(21 21 21 / 32%);
  }

  .binder-slot--filled {
    border-style: solid;
    border-color: #424242;
    background: #151515;
  }

  .binder-slot--decorated {
    border-color: transparent;
    background: transparent;
  }

  .binder-slot--decorated:hover {
    border-color: rgb(241 199 72 / 55%);
  }

  .binder-decoration {
    z-index: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-radius: 6px;
    pointer-events: none;
  }

  .binder-decoration img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
