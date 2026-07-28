<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <div class="column q-gutter-lg">
      <div>
        <q-btn
          flat
          dense
          color="grey-4"
          icon="arrow_back"
          :label="openedFromSearch ? 'Back to search' : 'Back to set'"
          no-caps
          class="q-mb-sm"
          @click="goBack"
        />
        <div class="text-overline text-yellow-6">
          Card detail
        </div>
        <div class="text-h4 text-weight-bold q-my-sm">
          {{ displayName }}
        </div>
        <div class="text-body2 text-grey-4 q-ma-none">
          <router-link v-if="currentSet" :to="`/set/${currentSet.id}`" class="text-grey-4">
            {{ localizedValue(currentSet.name, selectedLanguageId) ?? currentSet.id }}
          </router-link>
          <span v-else>Unknown set</span>
          · #{{ currentCard?.number ?? '??' }}
        </div>
      </div>

      <div class="row q-col-gutter-lg items-start">
        <div class="col-12 col-sm-8 col-md-4 col-lg-3">
          <q-card flat bordered class="bg-grey-10 text-white">
            <q-responsive :ratio="cardImageRatio" class="bg-grey-9 relative-position">
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
              <div
                v-if="selectedImage.url && selectedImage.isFallback && selectedImage.source === 'automatic'"
                class="fallback-language-overlay"
              >
                <span>{{ selectedImage.languageId }} fallback scan</span>
              </div>
              <div v-if="!selectedImageUrl" class="column items-center justify-center full-height full-width text-grey-5">
                <q-icon name="image" size="42px" />
                <div class="text-caption q-mt-sm">
                  Image placeholder
                </div>
              </div>
            </q-responsive>
            <q-card-actions v-if="!hasAutomaticImage">
              <q-btn
                class="col"
                flat
                color="primary"
                icon="add_photo_alternate"
                :label="currentManualImage ? 'Replace manual image' : 'Add manual image'"
                no-caps
                :disable="!currentCard || !selectedVariant"
                @click="openManualImageDialog"
              />
              <q-btn
                v-if="currentManualImage"
                flat
                round
                color="negative"
                icon="delete"
                :loading="manualImageSaving"
                @click="deleteManualImage"
              >
                <q-tooltip>Delete manual image</q-tooltip>
              </q-btn>
            </q-card-actions>
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
              <div class="col-12 col-sm-auto">
                <div class="row items-center no-wrap">
                  <q-btn
                    color="primary"
                    text-color="black"
                    icon="add_circle"
                    label="Add to collection"
                    no-caps
                    :disable="!currentCard || !selectedVariant"
                    @click="showCollectionDialog = true"
                  />
                  <q-btn
                    class="q-ml-xs"
                    flat
                    round
                    :color="isWanted ? 'red-5' : 'grey-5'"
                    :icon="isWanted ? 'favorite' : 'favorite_border'"
                    :disable="!currentCard || !selectedVariant"
                    @click="showWantListDialog = true"
                  >
                    <q-tooltip>{{ isWanted ? 'Add another wanted copy' : 'Add to want list' }}</q-tooltip>
                  </q-btn>
                  <q-badge v-if="ownedQuantity > 0" rounded color="primary" text-color="black" class="q-ml-sm">
                    ×{{ ownedQuantity }}
                    <q-tooltip>Owned in {{ selectedLanguageId }} across all collection folders</q-tooltip>
                  </q-badge>
                </div>
              </div>
            </div>

            <q-list bordered separator class="bg-grey-10 rounded-borders">
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Set</q-item-label>
                  <q-item-label>
                    <router-link v-if="currentSet" :to="`/set/${currentSet.id}`" class="text-white">
                      {{ localizedValue(currentSet.name, selectedLanguageId) ?? currentSet.id }}
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

              <q-item v-if="selectedCardmarket">
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Cardmarket price</q-item-label>
                  <q-item-label v-if="selectedCardmarketPrice !== null" class="text-h6 text-yellow-6 text-weight-bold">
                    {{ formatEuroPrice(selectedCardmarketPrice) }}
                  </q-item-label>
                  <q-item-label v-else>Price unavailable</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    <template v-if="selectedCardmarket.low !== null">Low: {{ formatEuroPrice(selectedCardmarket.low) }}</template>
                    <template v-if="selectedCardmarket.average_30d !== null">
                      <span v-if="selectedCardmarket.low !== null"> · </span>30-day average: {{ formatEuroPrice(selectedCardmarket.average_30d) }}
                    </template>
                    <template v-if="selectedCardmarket.updated_at">
                      · Updated {{ formatPriceDate(selectedCardmarket.updated_at) }}
                    </template>
                  </q-item-label>
                  <q-item-label v-if="selectedCardmarket.url" class="q-mt-xs">
                    <a :href="selectedCardmarket.url" target="_blank" rel="noopener noreferrer" class="text-yellow-6">
                      View on Cardmarket
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Pokemon</q-item-label>
                  <q-item-label>
                    <template v-if="currentCard?.pokemon?.length">
                      <router-link v-for="(pokemon, index) in currentCard.pokemon" :key="pokemon" :to="{ path: '/cards/search', query: { pokemon } }" class="text-white">
                        {{ pokemonName(pokemon) }}<span v-if="index < currentCard.pokemon.length - 1" class="text-white">, </span>
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

              <q-item v-for="attack in currentCard?.attacks ?? []" :key="localizedValue(attack.name, selectedLanguageId) ?? attack.damage">
                <q-item-section>
                  <q-item-label caption class="text-grey-5">Attack</q-item-label>
                  <q-item-label>{{ localizedValue(attack.name, selectedLanguageId) }} · {{ attack.damage }}</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    {{ attack.cost.join(', ') }}<span v-if="localizedValue(attack.text, selectedLanguageId)"> · {{ localizedValue(attack.text, selectedLanguageId) }}</span>
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

    <add-to-collection-dialog
      v-if="currentCard && selectedVariant"
      v-model="showCollectionDialog"
      :set-id="setId"
      :card-id="currentCard.id"
      :variant-id="selectedVariant.id"
      :language-id="selectedLanguageId"
      :card-name="`${displayName} (${formatValue(selectedVariant.id)})`"
    />
    <add-to-want-list-dialog
      v-if="currentCard && selectedVariant"
      v-model="showWantListDialog"
      :set-id="setId"
      :card-id="currentCard.id"
      :variant-id="selectedVariant.id"
      :language-id="selectedLanguageId"
      :card-name="`${displayName} (${formatValue(selectedVariant.id)})`"
    />

    <q-dialog v-model="showManualImageDialog">
      <q-card class="bg-grey-10 text-white" style="width: 520px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">{{ currentManualImage ? 'Replace manual image' : 'Add manual image' }}</div>
          <div class="text-body2 text-grey-4">
            {{ displayName }} · {{ formatValue(selectedVariantId) }} · {{ selectedLanguageId.toUpperCase() }}
          </div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-file
            v-model="manualImageFile"
            dark
            outlined
            accept="image/jpeg,image/png,image/webp"
            label="Choose a JPEG, PNG, or WebP image"
            @update:model-value="prepareManualImage"
          >
            <template #prepend><q-icon name="image" /></template>
          </q-file>
          <q-img
            v-if="manualImagePreview"
            :src="manualImagePreview"
            fit="contain"
            style="max-height: 440px"
            class="bg-grey-9 rounded-borders"
          />
          <q-banner v-if="manualImageError" class="bg-red-10 text-negative rounded-borders">
            {{ manualImageError }}
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-4" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            text-color="black"
            label="Save image"
            :disable="!manualImageDataUrl"
            :loading="manualImageSaving"
            @click="saveManualImage"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useStore } from 'vuex';

  // import components
  import LanguageSelector from '../components/LanguageSelector.vue';
  import AddToCollectionDialog from '../components/AddToCollectionDialog.vue';
  import AddToWantListDialog from '../components/AddToWantListDialog.vue';

  // import utils
  import { getCardById, getPokemon, getSetById } from '../utils/dataManagement';
  import { resolveCardImage } from '../utils/cardImages';
  import type { ResolvedCardImage } from '../utils/cardImages';
  import { cardImageRatio, cardmarketDisplayPrice, formatEuroPrice } from '../utils/cardDisplay';
  import { localizedValue } from '../utils/localization';
  import type { Card, CardmarketPrice, CardModifier, CardVariant, Pokemon, Set } from '../utils/types';
  import type { AppState } from '../store';
  import { collectionStore } from '../utils/collection';
  import { manualImageStore } from '../utils/manualImages';
  import { formatFrenchDate } from '../utils/dates';

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

  // Whether this card detail was opened from the card search page.
  const openedFromSearch: boolean = route.query.from === 'search';

  // Selected set metadata.
  const currentSet: Set | null = getSetById(setId);

  // Selected card data.
  const currentCard: Card | null = getCardById(setId, cardId);

  // Standardized Pokemon metadata keyed by the ids stored on cards.
  const pokemonById = new Map<string, Pokemon>(getPokemon().map((pokemon) => [pokemon.id, pokemon]));


  /* reactive vars */
  // Currently selected variant used for the large image.
  const requestedVariantId: string = String(route.query.variant ?? '');
  const selectedVariantId = ref(
    currentCard?.variants.some((variant) => variant.id === requestedVariantId)
      ? requestedVariantId
      : currentCard?.variants[0]?.id ?? 'normal'
  );
  const showCollectionDialog = ref(false);
  const showWantListDialog = ref(false);
  const showManualImageDialog = ref(false);
  const manualImageFile = ref<File | null>(null);
  const manualImageDataUrl = ref<string | null>(null);
  const manualImagePreview = ref<string | null>(null);
  const manualImageError = ref<string | null>(null);
  const manualImageSaving = ref(false);

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
  const selectedImage = computed<ResolvedCardImage>(() => {
    return selectedVariant.value
      ? resolveCardImage(
        selectedVariant.value.images,
        selectedLanguageId.value,
        currentSet?.series_id.startsWith('asia-') ? 'ja' : 'en',
        { setId, cardId, variantId: selectedVariant.value.id }
      )
      : { url: null, languageId: null, isFallback: false, source: null };
  });

  const selectedImageUrl = computed<string | null>(() => selectedImage.value.url);
  const hasAutomaticImage = computed<boolean>(() =>
    Boolean(selectedVariant.value?.images[selectedLanguageId.value])
  );
  const currentManualImage = computed(() =>
    selectedVariant.value
      ? manualImageStore.find(setId, cardId, selectedVariant.value.id, selectedLanguageId.value)
      : null
  );

  const selectedCardmarket = computed<CardmarketPrice | null>(() => selectedVariant.value?.cardmarket ?? null);

  const selectedCardmarketPrice = computed<number | null>(() => cardmarketDisplayPrice(selectedCardmarket.value));

  const ownedQuantity = computed<number>(() => {
    if (!currentCard || !selectedVariant.value) return 0;
    return collectionStore.entries.value
      .filter((entry) =>
        !entry.wanted
        &&
        entry.set_id === setId
        && entry.card_id === currentCard.id
        && entry.variant_id === selectedVariant.value?.id
        && entry.language_id === selectedLanguageId.value
      )
      .reduce((total, entry) => total + entry.quantity, 0);
  });

  const isWanted = computed<boolean>(() => Boolean(currentCard && selectedVariant.value)
    && collectionStore.entries.value.some((entry) =>
      entry.wanted
      && entry.set_id === setId
      && entry.card_id === currentCard?.id
      && entry.variant_id === selectedVariant.value?.id
      && entry.language_id === selectedLanguageId.value
    ));

  // Localized card display name.
  const displayName = computed<string>(() => {
    return localizedValue(currentCard?.name ?? {}, selectedLanguageId.value) ?? currentCard?.id ?? 'Unknown card';
  });

  // Localized evolution source.
  const localizedEvolvesFrom = computed<string | null>(() => {
    return currentCard?.evolves_from ? localizedValue(currentCard.evolves_from, selectedLanguageId.value) : null;
  });

  // Resolves a standardized Pokemon id for display in the selected language.
  const pokemonName = (pokemonId: string): string => {
    const pokemon = pokemonById.get(pokemonId);
    return pokemon ? localizedValue(pokemon.names, selectedLanguageId.value) ?? pokemon.name : pokemonId;
  };

  // Localized trainer rules text.
  const localizedRulesText = computed<string | null>(() => {
    return currentCard?.rules_text ? localizedValue(currentCard.rules_text, selectedLanguageId.value) : null;
  });


  /* methods */
  // Formats enum-like values for display.
  const formatValue = (value: string): string => {
    return value.replaceAll('_', ' ');
  };

  // Formats modifier values such as weakness and resistance.
  const modifierLabel = (modifiers: CardModifier[]): string => {
    if (modifiers.length === 0) return 'none';
    return modifiers.map((modifier) => `${modifier.type} ${modifier.value}`).join(', ');
  };

  const formatPriceDate = (value: string): string => {
    return formatFrenchDate(value);
  };

  const openManualImageDialog = (): void => {
    manualImageFile.value = null;
    manualImageDataUrl.value = null;
    manualImagePreview.value = currentManualImage.value
      ? `${currentManualImage.value.url}?v=${encodeURIComponent(currentManualImage.value.updated_at)}`
      : null;
    manualImageError.value = null;
    showManualImageDialog.value = true;
  };

  const prepareManualImage = (file: File | null): void => {
    manualImageDataUrl.value = null;
    manualImagePreview.value = null;
    manualImageError.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      manualImageError.value = 'Only JPEG, PNG, and WebP images are supported.';
      return;
    }
    if (file.size > 15_000_000) {
      manualImageError.value = 'The image must be smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      manualImageDataUrl.value = typeof reader.result === 'string' ? reader.result : null;
      manualImagePreview.value = manualImageDataUrl.value;
    };
    reader.onerror = () => {
      manualImageError.value = 'Unable to read the selected image.';
    };
    reader.readAsDataURL(file);
  };

  const saveManualImage = async (): Promise<void> => {
    if (!currentCard || !selectedVariant.value || !manualImageDataUrl.value) return;
    manualImageSaving.value = true;
    manualImageError.value = null;
    try {
      await manualImageStore.upload({
        set_id: setId,
        card_id: currentCard.id,
        variant_id: selectedVariant.value.id,
        language_id: selectedLanguageId.value,
        data_url: manualImageDataUrl.value
      });
      showManualImageDialog.value = false;
    } catch (error) {
      manualImageError.value = error instanceof Error ? error.message : String(error);
    } finally {
      manualImageSaving.value = false;
    }
  };

  const deleteManualImage = async (): Promise<void> => {
    if (!currentCard || !selectedVariant.value || !currentManualImage.value) return;
    manualImageSaving.value = true;
    manualImageError.value = null;
    try {
      await manualImageStore.remove(setId, currentCard.id, selectedVariant.value.id, selectedLanguageId.value);
    } catch (error) {
      manualImageError.value = error instanceof Error ? error.message : String(error);
    } finally {
      manualImageSaving.value = false;
    }
  };

  // Navigates back to the page that opened this card detail.
  const goBack = (): void => {
    const destinationPath = openedFromSearch ? '/cards/search' : `/set/${setId}`;

    // Preserve the originating page's filters and scroll position when possible.
    if (String(window.history.state?.back ?? '').startsWith(destinationPath)) {
      router.back();
      return;
    }

    router.push(destinationPath);
  };
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
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    pointer-events: none;
    text-transform: uppercase;
  }

  .fallback-language-overlay span {
    padding: 4px 9px;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 6px;
    background: rgb(24 24 24 / 64%);
  }
</style>
