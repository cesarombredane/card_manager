<template>
  <q-card
    flat
    bordered
    class="app_surface text-white no-wrap cursor-pointer q-pa-none relative-position"
    :class="{ 'selected-card': selected, 'wanted-card': collection_entry?.wanted }"
    @click="
      selectable && collection_entry && !protected_entry
        ? $emit('toggle-selection', collection_entry)
        : $emit('click', card)
    "
  >
    <q-checkbox
      v-if="selectable && collection_entry && !protected_entry"
      :model-value="selected"
      class="selection-checkbox absolute-top-left q-ma-xs"
      color="primary"
      dark
      @click.stop
      @update:model-value="$emit('toggle-selection', collection_entry)"
    />
    <q-responsive :ratio="card_image_ratio" class="app_surface relative-position">
      <div v-if="card.preview_image_urls?.length" class="preview-collage full-height full-width">
        <div v-for="url in card.preview_image_urls" :key="url" class="preview-slice">
          <img :src="url" alt="" />
        </div>
      </div>
      <q-img v-else-if="card.image_url" :src="card.image_url" fit="contain" class="full-height">
        <template #error>
          <div class="column items-center justify-center full-height full-width text_secondary">
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
      <div v-if="status_overlay" class="status-overlay">
        <span>{{ status_overlay }}</span>
      </div>
      <div
        v-if="!card.image_url && !card.preview_image_urls?.length"
        class="column items-center justify-center full-height full-width text_secondary"
      >
        <q-icon name="image" size="28px" />
      </div>
    </q-responsive>

    <q-card-section class="q-pa-xs column overflow-hidden no-wrap">
      <div class="text-caption text_secondary ellipsis overflow-hidden text-no-wrap">
        <template v-if="card.set_name">{{ card.set_name }} · </template>#{{ card.number }}
      </div>
      <div class="text-caption text-weight-bold ellipsis overflow-hidden text-no-wrap">
        {{ card.display_name }}
      </div>
      <div class="text-caption text_secondary ellipsis overflow-hidden text-no-wrap">
        {{ format_card_value(card.rarity) }}
      </div>
      <div class="text-caption text_secondary ellipsis overflow-hidden text-no-wrap">
        <span v-if="card.types.length">{{ card.types.join(', ') }}</span>
        <span v-else-if="card.pokemon_names.length">{{ card.pokemon_names.join(', ') }}</span>
        <span v-else>No energy type</span>
      </div>
      <div class="text-caption text_secondary ellipsis overflow-hidden text-no-wrap">
        <span v-if="card.hp">{{ card.hp }} HP · </span
        >{{ card.illustrator ?? 'Unknown illustrator' }}
      </div>
      <div class="text-caption text-primary text-weight-bold">
        <template v-if="display_price !== null">
          {{ format_euro_price(display_price) }}
          <template v-if="collection_entry">
            each · {{ format_euro_price(display_price * collection_entry.quantity) }} total
          </template>
        </template>
        <template v-else>No available price</template>
      </div>
      <div v-if="collection_entry" class="row q-gutter-xs q-mt-xs">
        <q-badge v-if="collection_entry.wanted" color="secondary" text-color="dark"
          >Wanted ×{{ collection_entry.quantity }}</q-badge
        >
        <q-badge v-else color="primary" text-color="dark">×{{ collection_entry.quantity }}</q-badge>
        <q-badge color="dark" text-color="white">{{
          collection_entry.language_id.toUpperCase()
        }}</q-badge>
        <q-badge v-if="!collection_entry.wanted" color="dark" text-color="white">{{
          collection_entry.condition
        }}</q-badge>
      </div>
      <div class="row no-wrap q-gutter-xs q-mt-auto overflow-hidden">
        <q-badge v-if="card.is_manual" color="deep-orange-8" text-color="white">
          Manual card
        </q-badge>
        <q-badge color="dark" text-color="white" class="ellipsis overflow-hidden text-no-wrap">
          {{ card.category }}
        </q-badge>
        <q-badge
          v-if="card.variant_id !== 'normal'"
          color="dark"
          text-color="white"
          class="ellipsis overflow-hidden text-no-wrap"
        >
          {{ format_card_value(card.variant_id) }}
        </q-badge>
        <q-badge
          v-for="energy in card.energy_costs"
          :key="energy"
          color="dark"
          text-color="white"
          class="ellipsis overflow-hidden text-no-wrap"
        >
          {{ energy }}
        </q-badge>
      </div>
      <div v-if="!selectable" class="row items-center no-wrap q-mt-xs">
        <template v-if="collection_entry && !protected_entry">
          <q-btn
            class="col"
            dense
            flat
            color="primary"
            icon="edit"
            label="Edit"
            no-caps
            @click.stop="$emit('edit-entry', collection_entry)"
            ><q-tooltip :delay="1000">Edit</q-tooltip></q-btn
          >
          <q-btn
            dense
            flat
            round
            color="negative"
            icon="delete"
            no-caps
            aria-label="delete"
            @click.stop="$emit('delete-entry', collection_entry)"
          >
            <q-tooltip :delay="1000"
              >Remove from {{ collection_entry.wanted ? 'want list' : 'collection' }}</q-tooltip
            >
          </q-btn>
        </template>
        <template v-else-if="!collection_entry">
          <q-btn
            class="col"
            dense
            flat
            color="primary"
            icon="add_circle"
            label="Collection"
            no-caps
            @click.stop="$emit('add-to-collection', card)"
            ><q-tooltip :delay="1000">Collection</q-tooltip></q-btn
          >
          <q-btn
            dense
            flat
            round
            :color="wanted ? 'negative' : 'secondary'"
            :icon="wanted ? 'favorite' : 'favorite_border'"
            no-caps
            aria-label="Perform this action"
            @click.stop="$emit('add-to-want-list', card)"
          >
            <q-tooltip :delay="1000">{{
              wanted ? 'Add another wanted copy' : 'Add to want list'
            }}</q-tooltip>
          </q-btn>
          <q-badge
            v-if="owned_quantity > 0"
            rounded
            color="primary"
            text-color="dark"
            class="q-ml-xs"
          >
            ×{{ owned_quantity }}
            <q-tooltip :delay="1000">Owned across all collection folders</q-tooltip>
          </q-badge>
        </template>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
  // import hooks
  import { computed } from 'vue';

  // import utils
  import { collection_store } from '../store/modules/collection';
  import {
    card_image_ratio,
    cardmarket_display_price,
    format_card_value,
    format_euro_price,
  } from '../utils/card_display';

  // import types
  import type { Collection_Entry } from '../store/modules/collection';
  import type { Display_Card } from '../utils/card_display';

  /* hooks */
  const props = withDefaults(
    defineProps<{
      card: Display_Card;
      collection_entry?: Collection_Entry;
      selectable?: boolean;
      selected?: boolean;
      protected_entry?: boolean;
      status_overlay?: string;
    }>(),
    {
      collection_entry: undefined,
      selectable: false,
      selected: false,
      protected_entry: false,
      status_overlay: '',
    },
  );
  defineEmits<{
    click: [card: Display_Card];
    'add-to-collection': [card: Display_Card];
    'add-to-want-list': [card: Display_Card];
    'edit-entry': [entry: Collection_Entry];
    'delete-entry': [entry: Collection_Entry];
    'toggle-selection': [entry: Collection_Entry];
  }>();

  /* computed vars */
  const display_price = computed<number | null>(() =>
    props.card.is_manual
      ? (props.card.estimated_value ?? null)
      : cardmarket_display_price(props.card.cardmarket),
  );
  const owned_quantity = computed<number>(() =>
    collection_store.owned_quantity(props.card.set_id, props.card.card_id, props.card.variant_id),
  );
  const wanted = computed<boolean>(() =>
    collection_store.is_wanted(
      props.card.set_id,
      props.card.card_id,
      props.card.variant_id,
      props.card.language_id,
    ),
  );
</script>

<style scoped>
  .selection-checkbox {
    z-index: 3;
    border-radius: 50%;
    background: color-mix(in srgb, var(--app_background) 80%, transparent);
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
    background: color-mix(in srgb, var(--app_surface) 16%, transparent);
    backdrop-filter: blur(1.25px);
    color: var(--app_text);
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
    background: color-mix(in srgb, var(--app_surface) 64%, transparent);
  }

  .preview-collage {
    display: flex;
    overflow: hidden;
  }

  .preview-slice {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
  }

  .preview-slice img {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .status-overlay {
    position: absolute;
    z-index: 4;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--q-negative) 62%, transparent);
    pointer-events: none;
  }

  .status-overlay span {
    padding: 6px 10px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--app_background) 88%, transparent);
    color: white;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }
</style>
