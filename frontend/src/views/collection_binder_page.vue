<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-xl">
    <section v-if="!binder" class="row items-start justify-between q-col-gutter-md q-mb-lg">
      <div class="col">
        <q-btn
          flat
          dense
          color="secondary"
          icon="arrow_back"
          label="Back to collection"
          no-caps
          :to="`/collection/folder/${folder_id}`"
          ><q-tooltip :delay="1000">Back to collection</q-tooltip></q-btn
        >
        <div class="text-overline text-primary q-mt-sm">Binder organizer</div>
        <h1 class="text-h4 text-weight-bold q-my-none">
          {{ folder?.name ?? 'Unknown collection' }}
        </h1>
      </div>
    </section>

    <q-banner
      v-if="binder_store.save_error.value"
      class="status_error text-negative q-mb-md rounded-borders"
    >
      {{ binder_store.save_error.value }}
    </q-banner>
    <q-banner v-if="!folder" class="app_surface text_secondary"
      >This collection does not exist.</q-banner
    >
    <q-banner v-else-if="folder.type !== 'binder'" class="app_surface text_secondary">
      Binder options are only available for collections configured as binders.
    </q-banner>

    <div v-else-if="binder" class="row q-col-gutter-lg items-start">
      <aside class="col-12 col-lg-3">
        <div class="q-mb-md">
          <q-btn
            flat
            dense
            color="secondary"
            icon="arrow_back"
            label="Back to collection"
            no-caps
            :to="`/collection/folder/${folder_id}`"
            ><q-tooltip :delay="1000">Back to collection</q-tooltip></q-btn
          >
          <div class="text-overline text-primary q-mt-sm">Binder organizer</div>
          <div class="text-h5 text-weight-bold">{{ folder.name }}</div>
          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              outline
              color="primary"
              icon="auto_awesome"
              label="Auto Michi"
              no-caps
              @click="open_michi_dialog"
              ><q-tooltip :delay="1000">Auto Michi</q-tooltip></q-btn
            >
            <q-btn
              outline
              color="primary"
              icon="settings"
              label="Binder settings"
              no-caps
              :disable="binder.locked_pages.length > 0"
              @click="open_settings"
            >
              <q-tooltip v-if="binder.locked_pages.length"
                >Unlock all pages before changing binder dimensions</q-tooltip
              >
            </q-btn>
          </div>
        </div>

        <q-card flat bordered class="app_surface text-white">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between">
              <div class="text-h6">Binder items</div>
              <div
                v-if="selector_tab === 'proxies' || selector_tab === 'images'"
                class="row no-wrap"
              >
                <binder-print-button
                  v-if="selector_tab === 'images'"
                  :folder_id="folder_id"
                  :selected_image_ids="selected_image_ids"
                />
                <q-btn
                  v-if="selector_tab === 'images'"
                  flat
                  round
                  dense
                  color="primary"
                  icon="add_photo_alternate"
                  no-caps
                  aria-label="Add multiple binder images"
                  @click="show_bulk_image_dialog = true"
                >
                  <q-tooltip :delay="1000">Add multiple images automatically</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="add"
                  no-caps
                  :aria-label="selector_tab === 'proxies' ? 'Add proxy card' : 'Add binder image'"
                  @click="asset_create_dialog?.open(selector_tab)"
                >
                  <q-tooltip :delay="1000"
                    >Add {{ selector_tab === 'proxies' ? 'proxy' : 'image' }}</q-tooltip
                  >
                </q-btn>
              </div>
            </div>
            <q-tabs
              v-model="selector_tab"
              dense
              active-color="primary"
              indicator-color="primary"
              class="q-mt-sm"
            >
              <q-tab name="collection" label="Cards" />
              <q-tab name="wanted" label="Wanted" />
              <q-tab name="proxies" label="Proxies" />
              <q-tab name="images" label="Images" />
            </q-tabs>
            <div class="text-caption text_secondary q-mt-sm">{{ selector_help }}</div>
            <q-input v-model="search" dark dense outlined clearable class="q-mt-sm" label="Search">
              <template #prepend><q-icon name="search" /></template>
            </q-input>
            <card-sort-selector
              v-if="selector_tab === 'collection' || selector_tab === 'wanted'"
              v-model="selected_card_sort"
              class="q-mt-sm"
            />
          </q-card-section>
          <q-separator dark />
          <q-virtual-scroll
            v-if="selector_tab === 'collection' || selector_tab === 'wanted'"
            v-slot="{ item: row }"
            :items="available_rows"
            virtual-scroll-item-size="72"
            separator
            style="height: 50vh"
          >
            <q-item
              :key="row.entry.id"
              dense
              :draggable="row.available > 0"
              :class="{ text_secondary: row.available === 0, 'cursor-grab': row.available > 0 }"
              @dragstart="start_entry_drag(row.entry.id, $event)"
            >
              <q-item-section avatar>
                <div
                  v-if="row.card.preview_image_urls?.length"
                  class="binder-preview-collage"
                  :class="{ 'wanted-image': row.entry.wanted }"
                >
                  <div v-for="url in row.card.preview_image_urls" :key="url">
                    <img :src="url" alt="" />
                  </div>
                </div>
                <q-img
                  v-else-if="row.card.image_url"
                  :src="row.card.image_url"
                  fit="contain"
                  width="44px"
                  height="60px"
                  :class="{ 'wanted-image': row.entry.wanted }"
                />
                <q-icon v-else name="style" size="32px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ row.card.display_name }}</q-item-label>
                <q-item-label caption class="text_secondary">
                  {{ row.card.set_name }} · {{ row.entry.language_id.toUpperCase() }} ·
                  {{ row.entry.condition }}
                </q-item-label>
                <q-item-label
                  v-if="collection_store.pokedex_entry_status(row.entry.id)"
                  caption
                  class="text-negative text-weight-bold"
                >
                  {{ collection_store.pokedex_entry_status(row.entry.id) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge
                  :color="row.available > 0 ? 'primary' : 'dark'"
                  :text-color="row.available > 0 ? 'black' : 'white'"
                >
                  {{ row.available }} / {{ row.entry.quantity }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-virtual-scroll>
          <q-scroll-area v-else style="height: 50vh">
            <q-list v-if="selector_tab === 'proxies'" separator>
              <q-item
                v-for="proxy in filtered_proxies"
                :key="proxy.id"
                dense
                :draggable="proxy_available(proxy) > 0"
                :class="{
                  text_secondary: proxy_available(proxy) === 0,
                  'cursor-grab': proxy_available(proxy) > 0,
                }"
                @dragstart="start_proxy_drag(proxy.id, $event)"
              >
                <q-item-section avatar>
                  <q-img
                    :src="binder_asset_url(proxy.id, 'proxy')"
                    fit="contain"
                    width="44px"
                    height="60px"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ proxy.name }}</q-item-label>
                  <q-item-label caption>
                    <span v-if="proxy.date">{{ proxy.date }} · </span>
                    {{ proxy_available(proxy) }} / {{ proxy.quantity }} available
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div v-if="!is_asset_locked('proxy', proxy.id)" class="row no-wrap">
                    <q-btn
                      flat
                      round
                      dense
                      color="secondary"
                      icon="edit"
                      no-caps
                      :aria-label="`Edit proxy ${proxy.name}`"
                      @click="asset_edit_dialog?.open('proxy', proxy.id)"
                    >
                      <q-tooltip :delay="1000">Edit proxy</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="delete"
                      no-caps
                      :aria-label="`Delete proxy ${proxy.name}`"
                      @click="request_delete_asset('proxy', proxy.id)"
                      ><q-tooltip :delay="1000">delete</q-tooltip></q-btn
                    >
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="filtered_proxies.length === 0"
                ><q-item-section class="text_secondary"
                  >No proxies. Use + to upload one.</q-item-section
                ></q-item
              >
            </q-list>
            <q-list v-else separator>
              <q-item
                v-for="image in filtered_images"
                :key="image.id"
                dense
                :draggable="!is_asset_locked('image', image.id)"
                :class="{ 'cursor-grab': !is_asset_locked('image', image.id) }"
                @dragstart="start_image_drag(image.id, $event)"
              >
                <q-item-section side>
                  <q-checkbox
                    v-model="selected_image_ids"
                    :val="image.id"
                    color="primary"
                    @click.stop
                  />
                </q-item-section>
                <q-item-section avatar>
                  <q-img
                    :src="binder_asset_url(image.id, 'image')"
                    fit="contain"
                    width="48px"
                    height="48px"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ image.name }}</q-item-label>
                  <q-item-label caption>{{ image.width }} × {{ image.height }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div v-if="!is_asset_locked('image', image.id)" class="row no-wrap">
                    <q-btn
                      flat
                      round
                      dense
                      color="secondary"
                      icon="edit"
                      no-caps
                      :aria-label="`Edit image ${image.name}`"
                      @click="asset_edit_dialog?.open('image', image.id)"
                    >
                      <q-tooltip :delay="1000">Edit image</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="placed_image_ids.has(image.id)"
                      flat
                      round
                      dense
                      color="secondary"
                      icon="remove_circle"
                      no-caps
                      aria-label="Remove image from binder page"
                      @click="binder_store.remove_image_placement(folder_id, image.id)"
                    >
                      <q-tooltip :delay="1000">Remove from binder page</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="delete"
                      no-caps
                      :aria-label="`Delete image ${image.name}`"
                      @click="request_delete_asset('image', image.id)"
                      ><q-tooltip :delay="1000">delete</q-tooltip></q-btn
                    >
                  </div>
                </q-item-section>
              </q-item>
              <q-item v-if="filtered_images.length === 0"
                ><q-item-section class="text_secondary"
                  >No images. Use + to upload one.</q-item-section
                ></q-item
              >
            </q-list>
          </q-scroll-area>
        </q-card>
      </aside>

      <section class="col-12 col-lg-9">
        <div class="row items-center justify-between q-mb-md">
          <q-btn
            flat
            round
            icon="chevron_left"
            :disable="current_spread === 0"
            no-caps
            aria-label="Previous binder spread"
            @click="current_spread--"
            ><q-tooltip :delay="1000">chevron left</q-tooltip></q-btn
          >
          <div class="text-subtitle1 text-weight-bold">{{ spread_label }}</div>
          <q-btn
            flat
            round
            icon="chevron_right"
            :disable="current_spread >= binder.page_count"
            no-caps
            aria-label="Next binder spread"
            @click="current_spread++"
            ><q-tooltip :delay="1000">chevron right</q-tooltip></q-btn
          >
        </div>

        <div class="binder-spread">
          <div v-for="side in visible_sides" :key="side.position" class="binder-leaf">
            <div class="row items-center justify-center q-gutter-xs q-mb-xs">
              <span class="text-caption text_secondary">{{ side.label }}</span>
              <q-btn
                v-if="side.side_index !== null"
                flat
                round
                dense
                size="sm"
                color="primary"
                :icon="is_page_locked(side.side_index) ? 'lock' : 'lock_open'"
                no-caps
                :aria-label="
                  is_page_locked(side.side_index) ? 'Unlock this page face' : 'Lock this page face'
                "
                @click="toggle_page_lock(side.side_index)"
              >
                <q-tooltip :delay="1000">{{
                  is_page_locked(side.side_index) ? 'Unlock this page face' : 'Lock this page face'
                }}</q-tooltip>
              </q-btn>
            </div>
            <div
              v-if="side.side_index !== null"
              class="binder-page q-pa-sm rounded-borders"
              :class="{ 'binder-page--locked': is_page_locked(side.side_index) }"
              :style="{ gridTemplateColumns: `repeat(${binder_columns}, minmax(0, 1fr))` }"
            >
              <div
                v-for="decoration in side.decorations"
                :key="decoration.image.id"
                class="binder-decoration"
                :style="{
                  gridColumn: `${decoration.placement.column + 1} / span ${decoration.image.width}`,
                  gridRow: `${decoration.placement.row + 1} / span ${decoration.image.height}`,
                }"
              >
                <img
                  :src="binder_asset_url(decoration.image.id, 'image')"
                  :alt="decoration.image.name"
                />
              </div>
              <div
                v-for="slot in side.slots"
                :key="slot.index"
                class="binder-slot relative-position"
                :class="{
                  'binder-slot--filled': slot.content,
                  'binder-slot--decorated': slot.has_decoration && !slot.content,
                  'binder-slot--image-reserved': slot.has_decoration && !slot.accepts_card,
                }"
                :style="{ gridColumn: slot.column + 1, gridRow: slot.row_index + 1 }"
                @dragover.prevent
                @drop.prevent="drop_on_slot(slot.index, $event)"
              >
                <template v-if="slot.content">
                  <img
                    v-if="slot.content.image_url"
                    :src="slot.content.image_url"
                    :alt="slot.content.name"
                    :draggable="!is_slot_locked(slot.index)"
                    :class="{ 'wanted-image': slot.content.wanted }"
                    @dragstart="start_slot_drag(slot.index, $event)"
                  />
                  <div
                    v-else
                    class="full-height column items-center justify-center text-center q-pa-sm"
                    :draggable="!is_slot_locked(slot.index)"
                    @dragstart="start_slot_drag(slot.index, $event)"
                  >
                    <q-icon name="style" size="30px" color="secondary" />
                    <div class="text-caption q-mt-sm">{{ slot.content.name }}</div>
                  </div>
                  <div v-if="slot.content.status" class="slot-status-overlay">
                    {{ slot.content.status }}
                  </div>
                  <q-btn
                    v-if="!is_slot_locked(slot.index)"
                    class="slot-remove absolute-top-right q-ma-xs"
                    round
                    dense
                    size="xs"
                    color="dark"
                    icon="close"
                    no-caps
                    aria-label="Remove card from binder slot"
                    @click="binder_store.set_slot(folder_id, slot.index, null)"
                  >
                    <q-tooltip :delay="1000">Remove from binder</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="
                      !is_slot_locked(slot.index) &&
                      slot.content.wanted &&
                      slot.content.entry_id &&
                      !slot.content.pokedex_requirement
                    "
                    class="slot-got-it absolute-bottom q-ma-sm"
                    color="primary"
                    text-color="dark"
                    icon="check_circle"
                    label="Got it"
                    no-caps
                    dense
                    @click.stop="open_got_it(slot.index, slot.content.entry_id)"
                    ><q-tooltip :delay="1000">Got it</q-tooltip></q-btn
                  >
                </template>
                <div
                  v-else-if="!slot.has_decoration"
                  class="full-height column items-center justify-center text_secondary"
                >
                  <q-icon name="add" size="24px" />
                  <span class="text-caption">Drop here</span>
                </div>
              </div>
            </div>
            <div
              v-else
              class="binder-page binder-page--empty rounded-borders column items-center justify-center text_secondary"
            >
              <q-icon name="menu_book" size="42px" />
              <span class="text-caption q-mt-sm">No page</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <binder-setup-dialog :model-value="show_create_dialog" :folder_id="folder_id" />

    <binder-settings-dialog
      v-model="show_settings"
      :folder_id="folder_id"
      @saved="current_spread = 0"
    />

    <binder-layout-dialog v-model="show_michi_dialog" :folder_id="folder_id" :rows="base_rows" />

    <binder-asset-create-dialog ref="asset_create_dialog" :folder_id="folder_id" />

    <binder-bulk-images-dialog v-model="show_bulk_image_dialog" :folder_id="folder_id" />

    <binder-asset-edit-dialog
      ref="asset_edit_dialog"
      :folder_id="folder_id"
      :is_locked="is_asset_locked"
    />

    <q-dialog
      :model-value="delete_target !== null"
      @update:model-value="
        (value) => {
          if (!value) delete_target = null;
        }
      "
    >
      <q-card class="app_surface text-white" style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">
            Delete {{ delete_target?.kind === 'proxy' ? 'proxy' : 'image' }}?
          </div>
          <div class="text-body2 text_secondary q-mt-sm">
            “{{ delete_target?.name }}” will be permanently deleted
            {{
              delete_target?.kind === 'proxy'
                ? 'and removed from every binder slot.'
                : 'and removed from its binder page.'
            }}
          </div>
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn flat color="secondary" label="Cancel" no-caps @click="delete_target = null"
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn
            color="negative"
            label="Delete"
            :loading="delete_saving"
            no-caps
            @click="confirm_delete_asset"
            ><q-tooltip :delay="1000">Delete</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog
      :model-value="got_it_target !== null"
      @update:model-value="
        (value) => {
          if (!value) got_it_target = null;
        }
      "
    >
      <q-card class="app_surface text-white" style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Mark card as owned</div>
          <div class="text-body2 text_secondary">{{ got_it_card_name }}</div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="got_it_condition"
            :options="condition_options"
            emit-value
            map-options
            dark
            outlined
            label="Condition"
          />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn flat color="secondary" label="Cancel" no-caps @click="got_it_target = null"
            ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
          >
          <q-btn color="primary" text-color="dark" label="OK" no-caps @click="confirm_got_it"
            ><q-tooltip :delay="1000">OK</q-tooltip></q-btn
          >
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
  // import hooks
  import { computed, ref, watchEffect } from 'vue';
  import { useRoute } from 'vue-router';

  // import components
  import BinderAssetCreateDialog from '../components/binder/binder_asset_create_dialog.vue';
  import BinderBulkImagesDialog from '../components/binder/binder_bulk_images_dialog.vue';
  import BinderAssetEditDialog from '../components/binder/binder_asset_edit_dialog.vue';
  import BinderSettingsDialog from '../components/binder/binder_settings_dialog.vue';
  import BinderLayoutDialog from '../components/binder/binder_layout_dialog.vue';
  import BinderPrintButton from '../components/binder/binder_print_button.vue';
  import BinderSetupDialog from '../components/binder/binder_setup_dialog.vue';
  import CardSortSelector from '../components/card_sort_selector.vue';

  // import utils
  import { build_display_card, compare_card_release_and_number } from '../utils/card_display';
  import { get_card_by_id, get_pokemon, get_set_by_id } from '../services/catalog_storage';
  import { card_conditions, collection_store } from '../store/modules/collection';
  import { binder_slots_per_page, binder_store } from '../store/modules/binders';
  import { manual_image_store } from '../store/modules/manual_images';
  import { pokedex_placeholder_card } from '../utils/pokedex_binder';
  import { cardmarket_display_price } from '../utils/card_display';
  import { resolve_card_image } from '../utils/card_images';
  import { localized_value } from '../utils/localization';

  // import types
  import type { Card_Condition, Collection_Entry } from '../store/modules/collection';
  import type { Collection_Binder } from '../store/modules/binders';
  import type { Collection_Folder } from '../models/collection';
  import type { Display_Card } from '../utils/card_display';
  import type { Binder_Row } from '../models/binder_view';
  import type { Card_Sort } from '../utils/card_sorting';
  import type {
    Binder_Image,
    Binder_Image_Placement,
    Binder_Proxy,
  } from '../store/modules/binders';

  /* types */
  type Selector_Tab = 'collection' | 'wanted' | 'proxies' | 'images';

  /* hooks */
  const route = useRoute();

  /* const vars */
  const condition_options = card_conditions.map((condition) => ({ ...condition }));

  const pokemon = get_pokemon();

  const pokedex_by_pokemon_id = new Map(pokemon.map((entry) => [entry.id, entry.pokedex_id]));

  const pokedex_by_pokemon_name = new Map(
    pokemon.flatMap((entry) =>
      [
        entry.name,
        ...Object.values(entry.names).filter((name): name is string => Boolean(name)),
      ].map((name) => [name.toLocaleLowerCase(), entry.pokedex_id] as const),
    ),
  );

  /* reactive vars */
  const asset_create_dialog = ref<InstanceType<typeof BinderAssetCreateDialog> | null>(null);

  const asset_edit_dialog = ref<InstanceType<typeof BinderAssetEditDialog> | null>(null);

  const show_settings = ref<boolean>(false);

  const show_michi_dialog = ref<boolean>(false);

  const current_spread = ref<number>(0);

  const search = ref<string>('');

  const selected_card_sort = ref<Card_Sort>('release-desc');

  const selector_tab = ref<Selector_Tab>('collection');

  const show_bulk_image_dialog = ref<boolean>(false);

  const delete_target = ref<{ kind: 'proxy' | 'image'; id: string; name: string } | null>(null);

  const delete_saving = ref<boolean>(false);

  const selected_image_ids = ref<string[]>([]);

  const got_it_target = ref<{ slot_index: number; entry_id: string } | null>(null);

  const got_it_condition = ref<Card_Condition>('NM');

  /* computed vars */
  const folder_id = computed<string>(() => String(route.params.folderId ?? ''));

  const folder = computed<Collection_Folder | null>(
    () =>
      collection_store.folders.value.find((candidate) => candidate.id === folder_id.value) ?? null,
  );

  const binder = computed<Collection_Binder | null>(() => binder_store.get(folder_id.value));

  const show_create_dialog = computed<boolean>(() =>
    Boolean(folder.value?.type === 'binder' && binder_store.is_ready.value && !binder.value),
  );

  const base_rows = computed<Omit<Binder_Row, 'available'>[]>(() =>
    collection_store.entries.value
      .filter((entry) => entry.folder_id === folder_id.value)
      .flatMap((entry): Array<Omit<Binder_Row, 'available'>> => {
        const card = card_for_entry(entry);
        if (!card) return [];
        const manual =
          entry.set_id === 'manual-collection'
            ? collection_store.manual_cards.value.find(
                (candidate) => candidate.id === entry.card_id,
              )
            : null;
        const set = entry.set_id === 'manual-collection' ? null : get_set_by_id(entry.set_id);
        const pokedex_numbers = card.pokemon_names
          .map((pokemon_id) => pokedex_by_pokemon_id.get(pokemon_id))
          .filter((number): number is number => number !== undefined);
        return [
          {
            entry,
            card,
            release_date: manual?.release_date ?? set?.release_date ?? null,
            pokedex_number: pokedex_numbers.length
              ? Math.min(...pokedex_numbers)
              : manual?.pokemon_name
                ? (pokedex_by_pokemon_name.get(manual.pokemon_name.toLocaleLowerCase()) ?? null)
                : null,
            price: manual?.estimated_value ?? cardmarket_display_price(card.cardmarket),
          },
        ];
      }),
  );

  const used_counts = computed<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const entry_id of binder.value?.slots ?? []) {
      if (entry_id) counts.set(entry_id, (counts.get(entry_id) ?? 0) + 1);
    }
    return counts;
  });

  const rows = computed<Binder_Row[]>(() =>
    base_rows.value.map((row) => ({
      ...row,
      available: Math.max(0, row.entry.quantity - (used_counts.value.get(row.entry.id) ?? 0)),
    })),
  );

  const rows_by_entry_id = computed<Map<string, Binder_Row>>(
    () => new Map(rows.value.map((row) => [row.entry.id, row])),
  );

  const available_rows = computed<Binder_Row[]>(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return rows.value
      .filter((row) => row.entry.wanted === (selector_tab.value === 'wanted'))
      .filter(
        (row) =>
          !query ||
          row.card.display_name.toLocaleLowerCase().includes(query) ||
          row.card.set_name?.toLocaleLowerCase().includes(query),
      )
      .sort((left, right) => {
        const left_is_placed = left.available === 0;
        const right_is_placed = right.available === 0;
        if (left_is_placed !== right_is_placed) return left_is_placed ? 1 : -1;

        if (
          selected_card_sort.value === 'pokedex-asc' ||
          selected_card_sort.value === 'pokedex-desc'
        ) {
          if (left.pokedex_number === null && right.pokedex_number !== null) return 1;
          if (left.pokedex_number !== null && right.pokedex_number === null) return -1;
          if (
            left.pokedex_number !== null &&
            right.pokedex_number !== null &&
            left.pokedex_number !== right.pokedex_number
          ) {
            return selected_card_sort.value === 'pokedex-asc'
              ? left.pokedex_number - right.pokedex_number
              : right.pokedex_number - left.pokedex_number;
          }
        }
        if (selected_card_sort.value === 'price-asc' || selected_card_sort.value === 'price-desc') {
          if (left.price === null && right.price !== null) return 1;
          if (left.price !== null && right.price === null) return -1;
          if (left.price !== null && right.price !== null && left.price !== right.price) {
            return selected_card_sort.value === 'price-asc'
              ? left.price - right.price
              : right.price - left.price;
          }
        }
        if (
          selected_card_sort.value === 'release-asc' ||
          selected_card_sort.value === 'release-desc'
        ) {
          const comparison = compare_card_release_and_number(
            left.release_date,
            right.release_date,
            left.card.number,
            right.card.number,
            selected_card_sort.value === 'release-asc' ? 'asc' : 'desc',
          );
          if (comparison !== 0) return comparison;
        }
        return left.card.display_name.localeCompare(right.card.display_name);
      });
  });

  const binder_columns = computed<2 | 3>(() => (binder.value?.layout === '2x2' ? 2 : 3));

  const selector_help = computed<string>(
    () =>
      ({
        collection: 'Drag owned cards into slots. Each copy can be placed once.',
        wanted: 'Drag wanted cards into slots. They remain visually distinct in black and white.',
        proxies: 'Upload custom proxy cards and place each one in a card slot.',
        images: 'Upload background images that can span several slots.',
      })[selector_tab.value],
  );

  const used_proxy_counts = computed<Map<string, number>>(() => {
    const counts = new Map<string, number>();
    for (const slot of binder.value?.slots ?? []) {
      if (!slot?.startsWith('proxy:')) continue;
      const proxy_id = slot.slice(6);
      counts.set(proxy_id, (counts.get(proxy_id) ?? 0) + 1);
    }
    return counts;
  });

  const placed_image_ids = computed<Set<string>>(
    () => new Set((binder.value?.image_placements ?? []).map((placement) => placement.image_id)),
  );

  const binder_images_by_id = computed<Map<string, Binder_Image>>(
    () => new Map((binder.value?.images ?? []).map((image) => [image.id, image])),
  );

  const image_placements_by_side = computed<Map<number, Binder_Image_Placement[]>>(() => {
    const placements = new Map<number, Binder_Image_Placement[]>();
    for (const placement of binder.value?.image_placements ?? []) {
      if (!placements.has(placement.side_index)) placements.set(placement.side_index, []);
      placements.get(placement.side_index)?.push(placement);
    }
    return placements;
  });

  const filtered_proxies = computed<Binder_Proxy[]>(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return (binder.value?.proxies ?? []).filter(
      (proxy) => !query || proxy.name.toLocaleLowerCase().includes(query),
    );
  });

  const filtered_images = computed<Binder_Image[]>(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return (binder.value?.images ?? []).filter(
      (image) => !query || image.name.toLocaleLowerCase().includes(query),
    );
  });

  const visible_sides = computed<
    {
      position: string;
      side_index: number | null;
      label: string;
      slots: {
        index: number;
        row_index: number;
        column: number;
        has_decoration: boolean;
        accepts_card: boolean;
        content: {
          name: string;
          image_url: string | null;
          wanted: boolean;
          entry_id: string | null;
          status: string | null;
          pokedex_requirement: boolean;
        } | null;
      }[];
      decorations: { placement: Binder_Image_Placement; image: Binder_Image }[];
    }[]
  >(() => {
    const page_count = binder.value?.page_count ?? 0;
    const left_side_index = current_spread.value === 0 ? null : current_spread.value * 2 - 1;
    const right_side_index = current_spread.value >= page_count ? null : current_spread.value * 2;
    return [
      {
        position: 'left',
        side_index: left_side_index,
        label: left_side_index === null ? '' : `Page ${current_spread.value}`,
        slots: left_side_index === null ? [] : slots_for_side(left_side_index),
        decorations: left_side_index === null ? [] : decorations_for_side(left_side_index),
      },
      {
        position: 'right',
        side_index: right_side_index,
        label: right_side_index === null ? '' : `Page ${current_spread.value + 1}`,
        slots: right_side_index === null ? [] : slots_for_side(right_side_index),
        decorations: right_side_index === null ? [] : decorations_for_side(right_side_index),
      },
    ];
  });

  const spread_label = computed<string>(() => {
    const page_count = binder.value?.page_count ?? 0;
    if (current_spread.value === 0) return 'Page 1';
    if (current_spread.value === page_count) return `Page ${page_count}`;
    return `Pages ${current_spread.value}–${current_spread.value + 1}`;
  });

  const got_it_card_name = computed<string>(() => {
    const entry_id = got_it_target.value?.entry_id;
    return entry_id
      ? (rows.value.find((row) => row.entry.id === entry_id)?.card.display_name ?? '')
      : '';
  });

  /* functions */
  const card_for_entry = (entry: Collection_Entry): Display_Card | null => {
    if (entry.set_id === 'pokedex-requirement' && entry.pokedex_requirement_id) {
      return pokedex_placeholder_card(
        entry.pokedex_requirement_id,
        entry.pokedex_candidate_count ?? 0,
        folder.value?.pokedex_config?.international_language_id ?? 'en',
        folder.value?.pokedex_config,
      );
    }
    if (entry.set_id === 'manual-collection') {
      const manual = collection_store.manual_cards.value.find((card) => card.id === entry.card_id);
      if (!manual) return null;
      const image = resolve_card_image({}, entry.language_id, entry.language_id, {
        set_id: 'manual-collection',
        card_id: manual.id,
        variant_id: entry.variant_id,
      });
      return {
        id: manual.id,
        card_id: manual.id,
        set_id: entry.set_id,
        set_name: manual.set_name || null,
        language_id: entry.language_id,
        variant_id: entry.variant_id,
        number: manual.number || '?',
        display_name: manual.name,
        category: manual.category,
        rarity: manual.rarity,
        hp: manual.hp,
        illustrator: manual.illustrator || null,
        types: manual.types,
        pokemon_names: manual.pokemon_name ? [manual.pokemon_name] : [],
        energy_costs: [],
        image_url: image.url,
        image_language_id: image.language_id,
        image_is_fallback: false,
        image_source: image.source,
        cardmarket: null,
        is_manual: true,
        estimated_value: manual.estimated_value,
      };
    }
    const card = get_card_by_id(entry.set_id, entry.card_id);
    const set = get_set_by_id(entry.set_id);
    const variant = card?.variants.find((candidate) => candidate.id === entry.variant_id);
    if (!card || !variant) return null;
    return build_display_card(
      card,
      variant,
      entry.language_id,
      set ? (localized_value(set.name, entry.language_id) ?? set.id) : null,
    );
  };

  const proxy_available = (proxy: Binder_Proxy): number =>
    Math.max(0, proxy.quantity - (used_proxy_counts.value.get(proxy.id) ?? 0));

  const is_page_locked = (side_index: number): boolean =>
    binder.value?.locked_pages.includes(side_index) ?? false;

  const is_slot_locked = (slot_index: number): boolean =>
    Boolean(
      binder.value &&
      is_page_locked(Math.floor(slot_index / binder_slots_per_page(binder.value.layout))),
    );

  const is_asset_locked = (kind: 'proxy' | 'image', asset_id: string): boolean => {
    if (!binder.value) return false;
    if (kind === 'image') {
      return binder.value.image_placements.some(
        (placement) => placement.image_id === asset_id && is_page_locked(placement.side_index),
      );
    }
    return binder.value.slots.some(
      (slot, index) => slot === `proxy:${asset_id}` && is_slot_locked(index),
    );
  };

  const binder_asset_url = (asset_id: string, kind: 'proxy' | 'image'): string => {
    const asset = manual_image_store.find('binder-assets', folder_id.value, asset_id, kind);
    return asset ? `${asset.url}?v=${encodeURIComponent(asset.updated_at)}` : '';
  };

  const open_michi_dialog = (): void => {
    show_michi_dialog.value = true;
  };

  const slot_content = (
    slot_value: string | null,
  ): {
    name: string;
    image_url: string | null;
    wanted: boolean;
    entry_id: string | null;
    status: string | null;
    pokedex_requirement: boolean;
  } | null => {
    if (!slot_value) return null;
    if (slot_value.startsWith('proxy:')) {
      const proxy_id = slot_value.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxy_id);
      return proxy
        ? {
            name: proxy.name,
            image_url: binder_asset_url(proxy.id, 'proxy'),
            wanted: false,
            entry_id: null,
            status: null,
            pokedex_requirement: false,
          }
        : null;
    }
    const row = rows_by_entry_id.value.get(slot_value);
    return row
      ? {
          name: row.card.display_name,
          image_url: row.card.image_url,
          wanted: row.entry.wanted,
          entry_id: row.entry.id,
          status: collection_store.pokedex_entry_status(row.entry.id),
          pokedex_requirement: Boolean(row.entry.pokedex_requirement_id),
        }
      : null;
  };

  const slots_for_side = (side_index: number) => {
    if (!binder.value) return [];
    const count = binder_slots_per_page(binder.value.layout);
    const start = side_index * count;
    return binder.value.slots.slice(start, start + count).map((entry_id, offset) => {
      const row_index = Math.floor(offset / binder_columns.value);
      const column = offset % binder_columns.value;
      const covering_decorations = (image_placements_by_side.value.get(side_index) ?? []).flatMap(
        (placement) => {
          const image = binder_images_by_id.value.get(placement.image_id);
          const covers_slot = Boolean(
            image &&
            row_index >= placement.row &&
            row_index < placement.row + image.height &&
            column >= placement.column &&
            column < placement.column + image.width,
          );
          return covers_slot && image ? [{ image, placement }] : [];
        },
      );
      const has_decoration = covering_decorations.length > 0;
      const accepts_card = covering_decorations.every(({ image, placement }) => {
        const relative_row = row_index - placement.row;
        const relative_column = column - placement.column;
        return image.card_slots.includes(relative_row * image.width + relative_column);
      });
      return {
        index: start + offset,
        row_index: row_index,
        column,
        has_decoration: has_decoration,
        accepts_card: accepts_card,
        content: slot_content(entry_id),
      };
    });
  };

  const decorations_for_side = (side_index: number) => {
    if (!binder.value) return [];
    return (image_placements_by_side.value.get(side_index) ?? []).flatMap((placement) => {
      const image = binder_images_by_id.value.get(placement.image_id);
      return image ? [{ placement, image }] : [];
    });
  };

  const toggle_page_lock = (side_index: number): void => {
    binder_store.set_page_locked(folder_id.value, side_index, !is_page_locked(side_index));
  };

  const open_settings = (): void => {
    if (!binder.value || binder.value.locked_pages.length) return;
    show_settings.value = true;
  };

  const request_delete_asset = (kind: 'proxy' | 'image', asset_id: string): void => {
    if (is_asset_locked(kind, asset_id)) return;
    const asset =
      kind === 'proxy'
        ? binder.value?.proxies.find((candidate) => candidate.id === asset_id)
        : binder.value?.images.find((candidate) => candidate.id === asset_id);
    if (asset) delete_target.value = { kind, id: asset_id, name: asset.name };
  };

  const confirm_delete_asset = async (): Promise<void> => {
    if (!delete_target.value || is_asset_locked(delete_target.value.kind, delete_target.value.id))
      return;
    delete_saving.value = true;
    const target = delete_target.value;
    binder_store.remove_asset(folder_id.value, target.kind, target.id);
    await manual_image_store
      .remove('binder-assets', folder_id.value, target.id, target.kind)
      .catch(() => undefined);
    if (target.kind === 'image') {
      await manual_image_store
        .remove('binder-assets', folder_id.value, target.id, 'image-source')
        .catch(() => undefined);
    }
    delete_saving.value = false;
    delete_target.value = null;
  };

  const start_entry_drag = (entry_id: string, event: DragEvent): void => {
    const row = rows.value.find((candidate) => candidate.entry.id === entry_id);
    if (!row || row.available < 1 || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `entry:${entry_id}`);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const start_slot_drag = (slot_index: number, event: DragEvent): void => {
    if (is_slot_locked(slot_index)) {
      event.preventDefault();
      return;
    }
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', `slot:${slot_index}`);
    event.dataTransfer.effectAllowed = 'move';
  };

  const start_proxy_drag = (proxy_id: string, event: DragEvent): void => {
    const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxy_id);
    if (!proxy || proxy_available(proxy) < 1 || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `proxy:${proxy_id}`);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const start_image_drag = (image_id: string, event: DragEvent): void => {
    if (is_asset_locked('image', image_id)) {
      event.preventDefault();
      return;
    }
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', `image:${image_id}`);
    event.dataTransfer.effectAllowed = 'move';
  };

  const card_allowed_at_slot = (slot_index: number): boolean => {
    if (!binder.value) return false;
    const count = binder_slots_per_page(binder.value.layout);
    const side_index = Math.floor(slot_index / count);
    const local_index = slot_index % count;
    const row = Math.floor(local_index / binder_columns.value);
    const column = local_index % binder_columns.value;
    return binder.value.image_placements.every((placement) => {
      if (placement.side_index !== side_index) return true;
      const image = binder.value?.images.find((candidate) => candidate.id === placement.image_id);
      if (
        !image ||
        row < placement.row ||
        row >= placement.row + image.height ||
        column < placement.column ||
        column >= placement.column + image.width
      )
        return true;
      return image.card_slots.includes(
        (row - placement.row) * image.width + column - placement.column,
      );
    });
  };

  const drop_on_slot = (target_index: number, event: DragEvent): void => {
    if (is_slot_locked(target_index)) return;
    const payload = event.dataTransfer?.getData('text/plain') ?? '';
    if (!payload.startsWith('image:') && !card_allowed_at_slot(target_index)) return;
    if (payload.startsWith('slot:')) {
      binder_store.move_slot(folder_id.value, Number(payload.slice(5)), target_index);
      return;
    }
    if (payload.startsWith('entry:')) {
      const entry_id = payload.slice(6);
      const row = rows.value.find((candidate) => candidate.entry.id === entry_id);
      if (row && row.available > 0) binder_store.set_slot(folder_id.value, target_index, entry_id);
      return;
    }
    if (payload.startsWith('proxy:')) {
      const proxy_id = payload.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxy_id);
      if (proxy && proxy_available(proxy) > 0)
        binder_store.set_slot(folder_id.value, target_index, `proxy:${proxy_id}`);
      return;
    }
    if (payload.startsWith('image:') && binder.value) {
      const image_id = payload.slice(6);
      const count = binder_slots_per_page(binder.value.layout);
      const side_index = Math.floor(target_index / count);
      const local_index = target_index % count;
      binder_store.place_image(
        folder_id.value,
        image_id,
        side_index,
        Math.floor(local_index / binder_columns.value),
        local_index % binder_columns.value,
      );
    }
  };

  const open_got_it = (slot_index: number, entry_id: string): void => {
    if (is_slot_locked(slot_index)) return;
    got_it_condition.value = 'NM';
    got_it_target.value = { slot_index: slot_index, entry_id: entry_id };
  };

  const confirm_got_it = (): void => {
    if (!got_it_target.value) return;
    const owned_entry = collection_store.fulfill_wanted(
      got_it_target.value.entry_id,
      got_it_condition.value,
    );
    if (owned_entry)
      binder_store.set_slot(folder_id.value, got_it_target.value.slot_index, owned_entry.id);
    got_it_target.value = null;
  };

  /* watchers */
  watchEffect(() => {
    if (!binder_store.is_ready.value || !collection_store.is_file_connected.value || !binder.value)
      return;
    const quantities = new Map(base_rows.value.map((row) => [row.entry.id, row.entry.quantity]));
    binder_store.clean(folder_id.value, quantities);
    if (binder.value && current_spread.value > binder.value.page_count) {
      current_spread.value = binder.value.page_count;
    }
  });
</script>
