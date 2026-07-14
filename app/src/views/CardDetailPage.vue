<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <div class="column q-gutter-lg">
      <div>
        <q-btn flat dense color="grey-4" icon="arrow_back" label="Back to set" no-caps class="q-mb-sm" @click="goBackToSet" />
        <div class="text-overline text-yellow-6">
          Card detail
        </div>
        <div class="text-h4 text-weight-bold q-my-sm">
          {{ displayName }}
        </div>
        <div class="text-body2 text-grey-4 q-ma-none">
          <router-link v-if="currentSet" :to="`/set/${currentSet.id}`" class="text-grey-4">
            {{ currentSet.name }}
          </router-link>
          <span v-else>Unknown set</span>
          · #{{ currentCard?.number ?? '??' }}
        </div>
      </div>

      <div class="row q-col-gutter-lg items-start">
        <div class="col-12 col-sm-8 col-md-4 col-lg-3">
          <q-card flat bordered class="bg-grey-10 text-white">
            <q-responsive :ratio="3 / 4" class="bg-grey-9">
              <q-img v-if="selectedImageUrl" :src="selectedImageUrl" fit="contain" class="full-height">
                <template #error>
                  <div class="column items-center justify-center full-height full-width text-grey-5">
                    <q-icon name="image" size="42px" />
                    <div class="text-caption q-mt-sm">
                      Image placeholder
                    </div>
                  </div>
                </template>
              </q-img>
              <div v-else class="column items-center justify-center full-height full-width text-grey-5">
                <q-icon name="image" size="42px" />
                <div class="text-caption q-mt-sm">
                  Image placeholder
                </div>
              </div>
            </q-responsive>
          </q-card>
        </div>

        <div class="col-12 col-md-8 col-lg-9">
          <div class="column q-gutter-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-lg-auto">
                <language-selector v-model="selectedLanguageId" :language-ids="currentSet?.language_ids ?? []" />
              </div>
              <div class="col-12 col-sm-8 col-md-5 col-lg-4">
                <q-select v-model="selectedVariantId" :options="variantOptions" dark dense outlined label="Variant" />
              </div>
            </div>

            <q-list bordered separator class="bg-grey-10 rounded-borders">
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Set</q-item-label>
                  <q-item-label>
                    <router-link v-if="currentSet" :to="`/set/${currentSet.id}`" class="text-white">
                      {{ currentSet.name }}
                    </router-link>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Card information</q-item-label>
                  <q-item-label>{{ formatValue(currentCard?.rarity ?? 'unknown') }} · {{ currentCard?.category ?? 'unknown' }}</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    <span v-if="currentCard?.hp">{{ currentCard.hp }} HP · </span>
                    <span v-if="currentCard?.types?.length">{{ currentCard.types.join(', ') }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Artist</q-item-label>
                  <q-item-label>
                    <router-link v-if="currentCard?.illustrator" :to="{ path: '/cards/search', query: { artist: currentCard.illustrator } }" class="text-white">
                      {{ currentCard.illustrator }}
                    </router-link>
                    <span v-else>Unknown illustrator</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Pokemon</q-item-label>
                  <q-item-label>
                    <template v-if="currentCard?.pokemon?.length">
                      <router-link v-for="(pokemon, index) in currentCard.pokemon" :key="pokemon" :to="{ path: '/cards/search', query: { pokemon } }" class="text-white">
                        {{ pokemon }}<span v-if="index < currentCard.pokemon.length - 1" class="text-white">, </span>
                      </router-link>
                    </template>
                    <span v-else>No linked Pokemon</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="currentCard?.stage || localizedEvolvesFrom || currentCard?.rule_box">
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Pokemon details</q-item-label>
                  <q-item-label>
                    <span v-if="currentCard?.stage">{{ formatValue(currentCard.stage) }}</span>
                    <span v-if="localizedEvolvesFrom"> · Evolves from {{ localizedEvolvesFrom }}</span>
                    <span v-if="currentCard?.rule_box"> · {{ currentCard.rule_box }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="localizedRulesText">
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Rules text</q-item-label>
                  <q-item-label>{{ localizedRulesText }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-for="attack in currentCard?.attacks ?? []" :key="localizedValue(attack.name) ?? attack.damage">
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Attack</q-item-label>
                  <q-item-label>{{ localizedValue(attack.name) }} · {{ attack.damage }}</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    {{ attack.cost.join(', ') }}<span v-if="localizedValue(attack.text)"> · {{ localizedValue(attack.text) }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="currentCard?.weaknesses?.length || currentCard?.resistances?.length || currentCard?.retreat_cost !== undefined">
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Battle data</q-item-label>
                  <q-item-label>
                    Weakness: {{ modifierLabel(currentCard?.weaknesses ?? []) }}
                  </q-item-label>
                  <q-item-label caption class="text-grey-4">
                    Resistance: {{ modifierLabel(currentCard?.resistances ?? []) }} · Retreat: {{ currentCard?.retreat_cost ?? 0 }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useStore } from 'vuex';

  // import components
  import LanguageSelector from '../components/LanguageSelector.vue';

  // import utils
  import { getCardById, getSetById } from '../utils/dataManagement';
  import type { Card, CardModifier, CardVariant, Set } from '../utils/types';
  import type { AppState } from '../store';

  /* constant vars */
  // Current route used to identify the selected card.
  const route = useRoute();

  // Router used to navigate back to the set detail page.
  const router = useRouter();

  // Shared application state.
  const store = useStore<AppState>();

  // Current set id read from the route.
  const setId: string = String(route.params.setId ?? '');

  // Current card id read from the route.
  const cardId: string = String(route.params.cardId ?? '');

  // Selected set metadata.
  const currentSet: Set | null = getSetById(setId);

  // Selected card data.
  const currentCard: Card | null = getCardById(setId, cardId);


  /* reactive vars */
  // Currently selected variant used for the large image.
  const selectedVariantId = ref(currentCard?.variants[0]?.id ?? 'normal');

  // Currently selected language for localized card text and image.
  const selectedLanguageId = computed({
    get: (): string => {
      const preferredLanguageId: string = store.state.selected_language_id;
      return currentSet?.language_ids.includes(preferredLanguageId) ? preferredLanguageId : currentSet?.language_ids[0] ?? 'en';
    },
    set: (languageId: string): void => store.commit('set_sekected_language_id', languageId)
  });


  /* computed vars */
  // Variant options rendered by the q-select.
  const variantOptions = computed<string[]>(() => currentCard?.variants.map((variant) => variant.id) ?? []);

  // Currently selected card variant.
  const selectedVariant = computed<CardVariant | null>(() => {
    return currentCard?.variants.find((variant) => variant.id === selectedVariantId.value) ?? currentCard?.variants[0] ?? null;
  });

  // Image URL for the selected variant and selected language.
  const selectedImageUrl = computed<string | null>(() => {
    return selectedVariant.value?.images[selectedLanguageId.value] ?? null;
  });

  // Localized card display name.
  const displayName = computed<string>(() => {
    return localizedValue(currentCard?.name ?? {}) ?? currentCard?.id ?? 'Unknown card';
  });

  // Localized evolution source.
  const localizedEvolvesFrom = computed<string | null>(() => {
    return currentCard?.evolves_from ? localizedValue(currentCard.evolves_from) : null;
  });

  // Localized trainer rules text.
  const localizedRulesText = computed<string | null>(() => {
    return currentCard?.rules_text ? localizedValue(currentCard.rules_text) : null;
  });


  /* methods */
  // Formats enum-like values for display.
  const formatValue = (value: string): string => {
    return value.replaceAll('_', ' ');
  };

  // Returns a localized field value for the selected language.
  const localizedValue = (value: Record<string, string | null>): string | null => {
    return value[selectedLanguageId.value] ?? Object.values(value).find((item) => item) ?? null;
  };

  // Formats modifier values such as weakness and resistance.
  const modifierLabel = (modifiers: CardModifier[]): string => {
    if (modifiers.length === 0) return 'none';
    return modifiers.map((modifier) => `${modifier.type} ${modifier.value}`).join(', ');
  };

  // Navigates back to the current set detail page.
  const goBackToSet = (): void => {
    router.push(`/set/${setId}`);
  };
</script>
