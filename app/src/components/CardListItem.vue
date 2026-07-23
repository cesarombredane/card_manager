<template>
  <q-card flat bordered class="bg-grey-10 text-white no-wrap cursor-pointer q-pa-none" @click="$emit('click', card)">
    <q-responsive :ratio="cardImageRatio" class="bg-grey-9 relative-position">
      <q-img v-if="card.image_url" :src="card.image_url" fit="contain" class="full-height">
        <template #error>
          <div class="column items-center justify-center full-height full-width text-grey-5">
            <q-icon name="image" size="28px" />
          </div>
        </template>
      </q-img>
      <div
        v-if="card.image_is_fallback && card.image_language_id"
        class="fallback-language-overlay"
      >
        <span>{{ card.image_language_id }} scan</span>
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
      <div class="row no-wrap q-gutter-xs q-mt-auto overflow-hidden">
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
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
  import { cardImageRatio, formatCardValue } from '../utils/cardDisplay';
  import type { DisplayCard } from '../utils/cardDisplay';

  defineProps<{ card: DisplayCard }>();
  defineEmits<{ click: [card: DisplayCard] }>();
</script>

<style scoped>
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
