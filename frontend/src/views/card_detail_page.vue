<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <div class="column q-gutter-lg">
      <div>
        <q-btn
          flat
          dense
          color="secondary"
          icon="arrow_back"
          :label="back_button_label"
          no-caps
          class="q-mb-sm"
          @click="go_back"
          ><q-tooltip :delay="1000">{{ back_button_label }}</q-tooltip></q-btn
        >
        <div class="text-overline text-primary">Card detail</div>
        <h1 class="text-h4 text-weight-bold q-my-sm q-my-none">
          {{ display_name }}
        </h1>
        <div class="text-body2 text_secondary q-ma-none">
          <router-link v-if="current_set" :to="`/set/${current_set.id}`" class="text_secondary">
            {{ localized_value(current_set.name, selected_language_id) ?? current_set.id }}
          </router-link>
          <span v-else>Unknown set</span>
          · #{{ current_card?.number ?? '??' }}
        </div>
      </div>

      <div class="row q-col-gutter-lg items-start">
        <div class="col-12 col-sm-8 col-md-4 col-lg-3">
          <q-card flat bordered class="app_surface text-white">
            <q-responsive :ratio="card_image_ratio" class="app_surface relative-position">
              <q-img
                v-if="selected_image_url"
                :src="selected_image_url"
                fit="contain"
                class="full-height"
              >
                <template #error>
                  <div
                    class="column items-center justify-center full-height full-width text_secondary"
                  >
                    <q-icon name="image" size="42px" />
                    <div class="text-caption q-mt-sm">Image placeholder</div>
                  </div>
                </template>
              </q-img>
              <div
                v-if="
                  selected_image.url &&
                  selected_image.is_fallback &&
                  selected_image.source === 'automatic'
                "
                class="fallback-language-overlay"
              >
                <span>{{ selected_image.language_id }} fallback scan</span>
              </div>
              <div
                v-if="!selected_image_url"
                class="column items-center justify-center full-height full-width text_secondary"
              >
                <q-icon name="image" size="42px" />
                <div class="text-caption q-mt-sm">Image placeholder</div>
              </div>
            </q-responsive>
            <q-card-actions v-if="!has_automatic_image">
              <q-space />
              <q-btn
                class="col"
                flat
                color="primary"
                icon="add_photo_alternate"
                :label="current_manual_image ? 'Replace manual image' : 'Add manual image'"
                no-caps
                :disable="!current_card || !selected_variant"
                @click="open_manual_image_dialog"
                ><q-tooltip :delay="1000">{{
                  current_manual_image ? 'Replace manual image' : 'Add manual image'
                }}</q-tooltip></q-btn
              >
              <q-btn
                v-if="current_manual_image"
                flat
                round
                color="negative"
                icon="delete"
                :loading="manual_image_saving"
                no-caps
                aria-label="Delete manual image"
                @click="delete_manual_image"
              >
                <q-tooltip :delay="1000">Delete manual image</q-tooltip>
              </q-btn>
            </q-card-actions>
          </q-card>
        </div>

        <div class="col-12 col-md-8 col-lg-9">
          <div class="column q-gutter-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-lg-auto">
                <language-selector
                  v-model="selected_language_id"
                  :language_ids="current_set?.language_ids ?? []"
                />
              </div>
              <div class="col-12 col-sm-8 col-md-5 col-lg-4">
                <q-select
                  v-model="selected_variant_id"
                  :options="variant_options"
                  dark
                  dense
                  outlined
                  label="Variant"
                />
              </div>
              <div class="col-12 col-sm-auto">
                <div class="row items-center no-wrap">
                  <q-btn
                    color="primary"
                    text-color="dark"
                    icon="add_circle"
                    label="Add to collection"
                    no-caps
                    :disable="!current_card || !selected_variant"
                    @click="show_collection_dialog = true"
                    ><q-tooltip :delay="1000">Add to collection</q-tooltip></q-btn
                  >
                  <q-btn
                    class="q-ml-xs"
                    flat
                    round
                    :color="is_wanted ? 'negative' : 'secondary'"
                    :icon="is_wanted ? 'favorite' : 'favorite_border'"
                    :disable="!current_card || !selected_variant"
                    no-caps
                    :aria-label="is_wanted ? 'Add another wanted copy' : 'Add to want list'"
                    @click="show_want_list_dialog = true"
                  >
                    <q-tooltip :delay="1000">{{
                      is_wanted ? 'Add another wanted copy' : 'Add to want list'
                    }}</q-tooltip>
                  </q-btn>
                  <q-badge
                    v-if="owned_quantity > 0"
                    rounded
                    color="primary"
                    text-color="dark"
                    class="q-ml-sm"
                  >
                    ×{{ owned_quantity }}
                    <q-tooltip :delay="1000"
                      >Owned in {{ selected_language_id }} across all collection folders</q-tooltip
                    >
                  </q-badge>
                </div>
              </div>
            </div>

            <div
              v-if="owned_locations.length > 0 || wanted_locations.length > 0"
              class="column q-gutter-sm"
            >
              <div v-if="owned_locations.length > 0">
                <div class="text-caption text_secondary">In collection</div>
                <div class="row q-gutter-xs">
                  <q-chip
                    v-for="location in owned_locations"
                    :key="`owned-${location.folder_id}`"
                    clickable
                    :to="`/collection/folder/${location.folder_id}`"
                    dense
                    color="dark"
                    text-color="white"
                    icon="inventory_2"
                  >
                    {{ location.folder_name }} ×{{ location.quantity }}
                  </q-chip>
                </div>
              </div>
              <div v-if="wanted_locations.length > 0">
                <div class="text-caption text_secondary">Wanted in</div>
                <div class="row q-gutter-xs">
                  <q-chip
                    v-for="location in wanted_locations"
                    :key="`wanted-${location.folder_id}`"
                    clickable
                    :to="`/collection/folder/${location.folder_id}`"
                    dense
                    color="negative"
                    text-color="white"
                    icon="favorite"
                  >
                    {{ location.folder_name }} ×{{ location.quantity }}
                  </q-chip>
                </div>
              </div>
            </div>

            <q-list bordered separator class="app_surface rounded-borders">
              <q-item>
                <q-item-section>
                  <q-item-label caption class="text_secondary">Set</q-item-label>
                  <q-item-label>
                    <router-link
                      v-if="current_set"
                      :to="`/set/${current_set.id}`"
                      class="text-white"
                    >
                      {{
                        localized_value(current_set.name, selected_language_id) ?? current_set.id
                      }}
                    </router-link>
                  </q-item-label>
                  <q-item-label v-if="current_set" caption class="text_secondary">
                    Released {{ format_french_date(current_set.release_date) }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text_secondary">Card information</q-item-label>
                  <q-item-label
                    >{{ format_value(current_card?.rarity ?? 'unknown') }} ·
                    {{ current_card?.category ?? 'unknown' }}</q-item-label
                  >
                  <q-item-label caption class="text_secondary">
                    <span v-if="current_card?.hp">{{ current_card.hp }} HP · </span>
                    <span v-if="current_card?.types?.length">{{
                      current_card.types.join(', ')
                    }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text_secondary">Artist</q-item-label>
                  <q-item-label>
                    <router-link
                      v-if="current_card?.illustrator"
                      :to="{ path: '/cards/search', query: { artist: current_card.illustrator } }"
                      class="text-white"
                    >
                      {{ current_card.illustrator }}
                    </router-link>
                    <span v-else>Unknown illustrator</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="selected_cardmarket">
                <q-item-section>
                  <q-item-label caption class="text_secondary">Cardmarket price</q-item-label>
                  <q-item-label
                    v-if="selected_cardmarket_price !== null"
                    class="text-h6 text-primary text-weight-bold"
                  >
                    {{ format_euro_price(selected_cardmarket_price) }}
                  </q-item-label>
                  <q-item-label v-else>Price unavailable</q-item-label>
                  <q-item-label caption class="text_secondary">
                    <template v-if="selected_cardmarket.low !== null"
                      >Low: {{ format_euro_price(selected_cardmarket.low) }}</template
                    >
                    <template v-if="selected_cardmarket.average_30d !== null">
                      <span v-if="selected_cardmarket.low !== null"> · </span>30-day average:
                      {{ format_euro_price(selected_cardmarket.average_30d) }}
                    </template>
                    <template v-if="selected_cardmarket.updated_at">
                      · Updated {{ format_price_date(selected_cardmarket.updated_at) }}
                    </template>
                  </q-item-label>
                  <q-item-label v-if="selected_cardmarket.url" class="q-mt-xs">
                    <a
                      :href="selected_cardmarket.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary"
                    >
                      View on Cardmarket
                    </a>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption class="text_secondary">Pokemon</q-item-label>
                  <q-item-label>
                    <template v-if="current_card?.pokemon?.length">
                      <router-link
                        v-for="(pokemon, index) in current_card.pokemon"
                        :key="pokemon"
                        :to="{ path: '/cards/search', query: { pokemon } }"
                        class="text-white"
                      >
                        {{ pokemon_names(pokemon)
                        }}<span v-if="index < current_card.pokemon.length - 1" class="text-white"
                          >,
                        </span>
                      </router-link>
                    </template>
                    <span v-else>No linked Pokemon</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-if="current_card?.stage || localized_evolves_from || current_card?.rule_box"
              >
                <q-item-section>
                  <q-item-label caption class="text_secondary">Pokemon details</q-item-label>
                  <q-item-label>
                    <span v-if="current_card?.stage">{{ format_value(current_card.stage) }}</span>
                    <span v-if="localized_evolves_from">
                      · Evolves from {{ localized_evolves_from }}</span
                    >
                    <span v-if="current_card?.rule_box"> · {{ current_card.rule_box }}</span>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="localized_rules_text">
                <q-item-section>
                  <q-item-label caption class="text_secondary">Rules text</q-item-label>
                  <q-item-label>{{ localized_rules_text }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-for="attack in current_card?.attacks ?? []"
                :key="localized_value(attack.name, selected_language_id) ?? attack.damage"
              >
                <q-item-section>
                  <q-item-label caption class="text_secondary">Attack</q-item-label>
                  <q-item-label
                    >{{ localized_value(attack.name, selected_language_id) }} ·
                    {{ attack.damage }}</q-item-label
                  >
                  <q-item-label caption class="text_secondary">
                    {{ attack.cost.join(', ')
                    }}<span v-if="localized_value(attack.text, selected_language_id)">
                      · {{ localized_value(attack.text, selected_language_id) }}</span
                    >
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item
                v-if="
                  current_card?.weaknesses?.length ||
                  current_card?.resistances?.length ||
                  current_card?.retreat_cost !== undefined
                "
              >
                <q-item-section>
                  <q-item-label caption class="text_secondary">Battle data</q-item-label>
                  <q-item-label>
                    Weakness: {{ modifier_label(current_card?.weaknesses ?? []) }}
                  </q-item-label>
                  <q-item-label caption class="text_secondary">
                    Resistance: {{ modifier_label(current_card?.resistances ?? []) }} · Retreat:
                    {{ current_card?.retreat_cost ?? 0 }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>
    </div>

    <add-to-collection-dialog
      v-if="current_card && selected_variant"
      v-model="show_collection_dialog"
      :set_id="set_id"
      :card_id="current_card.id"
      :variant_id="selected_variant.id"
      :language_id="selected_language_id"
      :card_name="`${display_name} (${format_value(selected_variant.id)})`"
    />
    <add-to-want-list-dialog
      v-if="current_card && selected_variant"
      v-model="show_want_list_dialog"
      :set_id="set_id"
      :card_id="current_card.id"
      :variant_id="selected_variant.id"
      :language_id="selected_language_id"
      :card_name="`${display_name} (${format_value(selected_variant.id)})`"
    />

    <q-dialog v-model="show_manual_image_dialog">
      <q-card class="app_surface text-white" style="width: 520px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">
            {{ current_manual_image ? 'Replace manual image' : 'Add manual image' }}
          </div>
          <div class="text-body2 text_secondary">
            {{ display_name }} · {{ format_value(selected_variant_id) }} ·
            {{ selected_language_id.toUpperCase() }}
          </div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-file
            v-model="manual_image_file"
            dark
            outlined
            accept="image/jpeg,image/png,image/webp"
            label="Choose a JPEG, PNG, or WebP image"
            @update:model-value="prepare_manual_image"
          >
            <template #prepend><q-icon name="image" /></template>
          </q-file>
          <q-img
            v-if="manual_image_preview"
            :src="manual_image_preview"
            fit="contain"
            style="max-height: 440px"
            class="app_surface rounded-borders"
          />
          <q-banner v-if="manual_image_error" class="status_error text-negative rounded-borders">
            {{ manual_image_error }}
          </q-banner>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="primary"
            text-color="dark"
            label="Save image"
            :disable="!manual_image_data_url"
            :loading="manual_image_saving"
            no-caps
            @click="save_manual_image"
            ><q-tooltip :delay="1000">Save image</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { useRoute, useRouter } from 'vue-router';
  import { computed, ref } from 'vue';

  // import components
  import AddToCollectionDialog from '../components/add_to_collection_dialog.vue';
  import AddToWantListDialog from '../components/add_to_want_list_dialog.vue';
  import LanguageSelector from '../components/language_selector.vue';

  // import utils
  import { get_card_by_id, get_pokemon, get_set_by_id } from '../services/catalog_storage';
  import { manual_image_store } from '../store/modules/manual_images';
  import { collection_store } from '../store/modules/collection';
  import { resolve_card_image } from '../utils/card_images';
  import { localized_value } from '../utils/localization';
  import { format_french_date } from '../utils/dates';
  import { use_store } from '../store';
  import {
    card_image_ratio,
    cardmarket_display_price,
    format_euro_price,
  } from '../utils/card_display';

  // import types
  import type { Manual_Image_Entry } from '../store/modules/manual_images';
  import type { Resolved_Card_Image } from '../utils/card_images';
  import type {
    Card,
    Cardmarket_Price,
    Card_Modifier,
    Card_Variant,
    Pokemon,
    Set,
  } from '../models/catalog';

  /* types */
  type Card_Folder_Location = {
    folder_id: string;
    folder_name: string;
    quantity: number;
  };

  /* hooks */
  // Current route used to identify the selected card.

  const route = useRoute();

  // Router used to navigate back to the set detail page.
  const router = useRouter();

  // Shared application state.
  const store = use_store();

  /* const vars */
  // Current set id read from the route.

  const set_id: string = String(route.params.setId ?? '');

  // Current card id read from the route.
  const card_id: string = String(route.params.cardId ?? '');

  // Whether this card detail was opened from the card search page.
  const opened_from_search: boolean = route.query.from === 'search';

  // Collection folder that opened this card detail, when applicable.
  const collection_folder_id: string | null =
    route.query.from === 'collection' && typeof route.query.folder === 'string'
      ? route.query.folder
      : null;

  const back_button_label: string = opened_from_search
    ? 'Back to search'
    : collection_folder_id
      ? 'Back to collection'
      : 'Back to set';

  // Selected set metadata.
  const current_set: Set | null = get_set_by_id(set_id);

  // Selected card data.
  const current_card: Card | null = get_card_by_id(set_id, card_id);

  // Standardized Pokemon metadata keyed by the ids stored on cards.
  const pokemon_by_id = new Map<string, Pokemon>(
    get_pokemon().map((pokemon) => [pokemon.id, pokemon]),
  );

  // Currently selected variant used for the large image.
  const requested_variant_id: string = String(route.query.variant ?? '');

  /* reactive vars */
  const selected_variant_id = ref<string>(
    current_card?.variants.some((variant) => variant.id === requested_variant_id)
      ? requested_variant_id
      : (current_card?.variants[0]?.id ?? 'normal'),
  );

  const show_collection_dialog = ref<boolean>(false);

  const show_want_list_dialog = ref<boolean>(false);

  const show_manual_image_dialog = ref<boolean>(false);

  const manual_image_file = ref<File | null>(null);

  const manual_image_data_url = ref<string | null>(null);

  const manual_image_preview = ref<string | null>(null);

  const manual_image_error = ref<string | null>(null);

  const manual_image_saving = ref<boolean>(false);

  /* computed vars */
  // Currently selected language for localized card text and image.

  const selected_language_id = computed<string>({
    get: (): string => {
      const preferred_language_id: string = store.state.selected_language_id;
      return current_set?.language_ids.includes(preferred_language_id)
        ? preferred_language_id
        : (current_set?.language_ids[0] ?? 'en');
    },
    set: (language_id: string): void => store.commit('set_selected_language_id', language_id),
  });

  // Variant options rendered by the q-select.
  const variant_options = computed<string[]>(
    () => current_card?.variants.map((variant) => variant.id) ?? [],
  );

  // Currently selected card variant.
  const selected_variant = computed<Card_Variant | null>(() => {
    return (
      current_card?.variants.find((variant) => variant.id === selected_variant_id.value) ??
      current_card?.variants[0] ??
      null
    );
  });

  // Image URL for the selected variant and selected language.
  const selected_image = computed<Resolved_Card_Image>(() => {
    return selected_variant.value
      ? resolve_card_image(
          selected_variant.value.images,
          selected_language_id.value,
          current_set?.series_id.startsWith('asia-') ? 'ja' : 'en',
          { set_id: set_id, card_id: card_id, variant_id: selected_variant.value.id },
        )
      : { url: null, language_id: null, is_fallback: false, source: null };
  });

  const selected_image_url = computed<string | null>(() => selected_image.value.url);

  const has_automatic_image = computed<boolean>(() =>
    Boolean(selected_variant.value?.images[selected_language_id.value]),
  );

  const current_manual_image = computed<Manual_Image_Entry | null>(() =>
    selected_variant.value
      ? manual_image_store.find(
          set_id,
          card_id,
          selected_variant.value.id,
          selected_language_id.value,
        )
      : null,
  );

  const selected_cardmarket = computed<Cardmarket_Price | null>(
    () => selected_variant.value?.cardmarket ?? null,
  );

  const selected_cardmarket_price = computed<number | null>(() =>
    cardmarket_display_price(selected_cardmarket.value),
  );

  const owned_locations = computed<Card_Folder_Location[]>(() => card_locations(false));

  const wanted_locations = computed<Card_Folder_Location[]>(() => card_locations(true));

  const owned_quantity = computed<number>(() =>
    owned_locations.value.reduce((total, location) => total + location.quantity, 0),
  );

  const is_wanted = computed<boolean>(() => wanted_locations.value.length > 0);

  // Localized card display name.
  const display_name = computed<string>(() => {
    return (
      localized_value(current_card?.name ?? {}, selected_language_id.value) ??
      current_card?.id ??
      'Unknown card'
    );
  });

  // Localized evolution source.
  const localized_evolves_from = computed<string | null>(() => {
    return current_card?.evolves_from
      ? localized_value(current_card.evolves_from, selected_language_id.value)
      : null;
  });

  // Localized trainer rules text.

  const localized_rules_text = computed<string | null>(() => {
    return current_card?.rules_text
      ? localized_value(current_card.rules_text, selected_language_id.value)
      : null;
  });

  /* functions */
  const card_locations = (wanted: boolean): Card_Folder_Location[] => {
    if (!current_card || !selected_variant.value) return [];
    const quantities = new Map<string, number>();
    collection_store.entries.value
      .filter(
        (entry) =>
          entry.wanted === wanted &&
          entry.set_id === set_id &&
          entry.card_id === current_card.id &&
          entry.variant_id === selected_variant.value?.id &&
          entry.language_id === selected_language_id.value,
      )
      .forEach((entry) =>
        quantities.set(entry.folder_id, (quantities.get(entry.folder_id) ?? 0) + entry.quantity),
      );
    return [...quantities.entries()]
      .map(([folder_id, quantity]) => ({
        folder_id: folder_id,
        folder_name:
          collection_store.folders.value.find((folder) => folder.id === folder_id)?.name ??
          'Unknown collection',
        quantity,
      }))
      .sort((left, right) => left.folder_name.localeCompare(right.folder_name));
  };

  // Always displays both supported names so the species remains unambiguous
  // regardless of the currently selected card language.

  const pokemon_names = (pokemon_id: string): string => {
    const pokemon = pokemon_by_id.get(pokemon_id);
    if (!pokemon) return pokemon_id;
    const english_name = localized_value(pokemon.names, 'en') ?? pokemon.name;
    const french_name = localized_value(pokemon.names, 'fr') ?? 'Unavailable';
    return `English: ${english_name} · French: ${french_name}`;
  };

  // Formats enum-like values for display.

  const format_value = (value: string): string => {
    return value.replaceAll('_', ' ');
  };

  // Formats modifier values such as weakness and resistance.
  const modifier_label = (modifiers: Card_Modifier[]): string => {
    if (modifiers.length === 0) return 'none';
    return modifiers.map((modifier) => `${modifier.type} ${modifier.value}`).join(', ');
  };

  const format_price_date = (value: string): string => {
    return format_french_date(value);
  };

  const open_manual_image_dialog = (): void => {
    manual_image_file.value = null;
    manual_image_data_url.value = null;
    manual_image_preview.value = current_manual_image.value
      ? `${current_manual_image.value.url}?v=${encodeURIComponent(current_manual_image.value.updated_at)}`
      : null;
    manual_image_error.value = null;
    show_manual_image_dialog.value = true;
  };

  const prepare_manual_image = (file: File | null): void => {
    manual_image_data_url.value = null;
    manual_image_preview.value = null;
    manual_image_error.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      manual_image_error.value = 'Only JPEG, PNG, and WebP images are supported.';
      return;
    }
    if (file.size > 15_000_000) {
      manual_image_error.value = 'The image must be smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      manual_image_data_url.value = typeof reader.result === 'string' ? reader.result : null;
      manual_image_preview.value = manual_image_data_url.value;
    };
    reader.onerror = () => {
      manual_image_error.value = 'Unable to read the selected image.';
    };
    reader.readAsDataURL(file);
  };

  const save_manual_image = async (): Promise<void> => {
    if (!current_card || !selected_variant.value || !manual_image_data_url.value) return;
    manual_image_saving.value = true;
    manual_image_error.value = null;
    return manual_image_store
      .upload({
        set_id: set_id,
        card_id: current_card.id,
        variant_id: selected_variant.value.id,
        language_id: selected_language_id.value,
        data_url: manual_image_data_url.value,
      })
      .then(() => {
        show_manual_image_dialog.value = false;
      })
      .catch((err) => {
        manual_image_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        manual_image_saving.value = false;
      });
  };

  const delete_manual_image = async (): Promise<void> => {
    if (!current_card || !selected_variant.value || !current_manual_image.value) return;
    manual_image_saving.value = true;
    manual_image_error.value = null;
    return manual_image_store
      .remove(set_id, current_card.id, selected_variant.value.id, selected_language_id.value)
      .catch((err) => {
        manual_image_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        manual_image_saving.value = false;
      });
  };

  // Navigates back to the page that opened this card detail.
  const go_back = (): void => {
    const destination_path = opened_from_search
      ? '/cards/search'
      : collection_folder_id
        ? `/collection/folder/${collection_folder_id}`
        : `/set/${set_id}`;

    // Preserve the originating page's filters and scroll position when possible.
    if (String(window.history.state?.back ?? '').startsWith(destination_path)) {
      router.back();
      return;
    }

    router.push(destination_path);
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
    background: color-mix(in srgb, var(--app_surface) 16%, transparent);
    backdrop-filter: blur(1.25px);
    color: var(--app_text);
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
    background: color-mix(in srgb, var(--app_surface) 64%, transparent);
  }
</style>
