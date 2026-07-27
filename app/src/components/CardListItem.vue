<template>
  <q-card
    flat
    bordered
    class="bg-grey-10 text-white no-wrap cursor-pointer q-pa-none relative-position"
    :class="{ 'selected-card': selected, 'wanted-card': collectionEntry?.wanted }"
    @click="selectable && collectionEntry ? $emit('toggle-selection', collectionEntry) : $emit('click', card)"
  >
    <q-checkbox
      v-if="selectable && collectionEntry"
      :model-value="selected"
      class="selection-checkbox absolute-top-left q-ma-xs"
      color="primary"
      dark
      @click.stop
      @update:model-value="$emit('toggle-selection', collectionEntry)"
    />
    <q-responsive :ratio="cardImageRatio" class="bg-grey-9 relative-position">
      <q-img v-if="card.image_url" :src="card.image_url" fit="contain" class="full-height">
        <template #error>
          <div class="column items-center justify-center full-height full-width text-grey-5">
            <q-icon name="image" size="28px" />
          </div>
        </template>
      </q-img>
      <div
        v-if="card.image_url && card.image_is_fallback && card.image_source === 'automatic'"
        class="fallback-language-overlay"
      >
        <span>{{ card.image_language_id }} fallback scan</span>
      </div>
      <div v-if="!card.image_url" class="column items-center justify-center full-height full-width text-grey-5">
        <q-icon name="image" size="28px" />
      </div>
    </q-responsive>

    <q-card-section class="q-pa-xs column overflow-hidden no-wrap">
      <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
        <template v-if="card.set_name">{{ card.set_name }} · </template>#{{ card.number }}
      </div>
      <div class="text-caption text-weight-bold ellipsis overflow-hidden text-no-wrap">
        {{ card.display_name }}
      </div>
      <div class="text-caption text-grey-4 ellipsis overflow-hidden text-no-wrap">
        {{ formatCardValue(card.rarity) }}
      </div>
      <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
        <span v-if="card.types.length">{{ card.types.join(', ') }}</span>
        <span v-else-if="card.pokemon_names.length">{{ card.pokemon_names.join(', ') }}</span>
        <span v-else>No energy type</span>
      </div>
      <div class="text-caption text-grey-5 ellipsis overflow-hidden text-no-wrap">
        <span v-if="card.hp">{{ card.hp }} HP · </span>{{ card.illustrator ?? 'Unknown illustrator' }}
      </div>
      <div v-if="displayPrice !== null" class="text-caption text-yellow-6 text-weight-bold">
        {{ formatEuroPrice(displayPrice) }}
        <template v-if="collectionEntry">
          each · {{ formatEuroPrice(displayPrice * collectionEntry.quantity) }} total
        </template>
      </div>
      <div v-if="collectionEntry" class="row q-gutter-xs q-mt-xs">
        <q-badge v-if="collectionEntry.wanted" color="grey-5" text-color="black">Wanted ×{{ collectionEntry.quantity }}</q-badge>
        <q-badge v-else color="primary" text-color="black">×{{ collectionEntry.quantity }}</q-badge>
        <q-badge color="grey-8" text-color="white">{{ collectionEntry.language_id.toUpperCase() }}</q-badge>
        <q-badge v-if="!collectionEntry.wanted" color="grey-8" text-color="white">{{ collectionEntry.condition }}</q-badge>
      </div>
      <div class="row no-wrap q-gutter-xs q-mt-auto overflow-hidden">
        <q-badge v-if="card.is_manual" color="deep-orange-8" text-color="white">
          Manual card
        </q-badge>
        <q-badge color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ card.category }}
        </q-badge>
        <q-badge v-if="card.variant_id !== 'normal'" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ formatCardValue(card.variant_id) }}
        </q-badge>
        <q-badge v-for="energy in card.energy_costs" :key="energy" color="grey-9" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ energy }}
        </q-badge>
      </div>
      <div v-if="!selectable" class="row items-center no-wrap q-mt-xs">
        <template v-if="collectionEntry">
          <q-btn
            class="col"
            dense
            flat
            color="primary"
            icon="edit"
            label="Edit"
            no-caps
            @click.stop="$emit('edit-entry', collectionEntry)"
          />
          <q-btn
            dense
            flat
            round
            color="negative"
            icon="delete"
            @click.stop="$emit('delete-entry', collectionEntry)"
          >
            <q-tooltip>Remove from {{ collectionEntry.wanted ? 'want list' : 'collection' }}</q-tooltip>
          </q-btn>
        </template>
        <template v-else>
          <q-btn
            class="col"
            dense
            flat
            color="yellow-6"
            icon="add_circle"
            label="Collection"
            no-caps
            @click.stop="$emit('add-to-collection', card)"
          />
          <q-btn
            dense
            flat
            round
            :color="wanted ? 'red-5' : 'grey-5'"
            :icon="wanted ? 'favorite' : 'favorite_border'"
            @click.stop="$emit('add-to-want-list', card)"
          >
            <q-tooltip>{{ wanted ? 'Add another wanted copy' : 'Add to want list' }}</q-tooltip>
          </q-btn>
          <q-badge v-if="ownedQuantity > 0" rounded color="primary" text-color="black" class="q-ml-xs">
            ×{{ ownedQuantity }}
            <q-tooltip>Owned across all collection folders</q-tooltip>
          </q-badge>
        </template>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { cardImageRatio, cardmarketDisplayPrice, formatCardValue, formatEuroPrice } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';
  import { collectionStore } from '../utils/collection';
  import type { CollectionEntry } from '../utils/collection';

  const props = withDefaults(defineProps<{
    card: DisplayCard;
    collectionEntry?: CollectionEntry;
    selectable?: boolean;
    selected?: boolean;
  }>(), {
    selectable: false,
    selected: false
  });
  defineEmits<{
    click: [card: DisplayCard];
    'add-to-collection': [card: DisplayCard];
    'add-to-want-list': [card: DisplayCard];
    'edit-entry': [entry: CollectionEntry];
    'delete-entry': [entry: CollectionEntry];
    'toggle-selection': [entry: CollectionEntry];
  }>();

  const displayPrice = computed<number | null>(() =>
    props.card.is_manual ? props.card.estimated_value ?? null : cardmarketDisplayPrice(props.card.cardmarket)
  );
  const ownedQuantity = computed<number>(() => collectionStore.entries.value
    .filter((entry) =>
      !entry.wanted
      &&
      entry.set_id === props.card.set_id
      && entry.card_id === props.card.card_id
      && entry.variant_id === props.card.variant_id
    )
    .reduce((total, entry) => total + entry.quantity, 0));
  const wanted = computed<boolean>(() => collectionStore.entries.value.some((entry) =>
    entry.wanted
    && entry.set_id === props.card.set_id
    && entry.card_id === props.card.card_id
    && entry.variant_id === props.card.variant_id
    && entry.language_id === props.card.language_id
  ));
</script>

<style scoped>
  .selection-checkbox {
    z-index: 3;
    border-radius: 50%;
    background: rgb(20 20 20 / 80%);
  }

  .selected-card {
    outline: 2px solid var(--q-primary);
    outline-offset: -2px;
  }

  .wanted-card :deep(.q-img__image),
  .wanted-card .q-responsive {
    filter: grayscale(1);
  }

  .fallback-language-overlay {
    position: absolute;
    z-index: 2;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(32 32 32 / 16%);
    backdrop-filter: blur(1.25px);
    color: rgb(235 235 235 / 92%);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    pointer-events: none;
    text-transform: uppercase;
  }

  .fallback-language-overlay span {
    padding: 3px 7px;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 5px;
    background: rgb(24 24 24 / 64%);
  }
</style>
