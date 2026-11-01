<template>
  <q-dialog v-model="show_michi_dialog">
    <q-card class="app_surface text-white" style="width: 920px; max-width: 96vw; max-height: 92vh">
      <q-card-section>
        <div class="text-h6">Auto Michi layout</div>
        <div class="text-body2 text_secondary">
          Build a complete proposal from every owned card, wanted card, proxy, and illustration.
        </div>
      </q-card-section>
      <q-separator dark />
      <q-card-section class="michi-dialog-body">
        <div class="michi-options">
          <q-select
            v-model="michi_mode"
            :options="michi_mode_options"
            emit-value
            map-options
            dark
            outlined
            label="Organization"
          />
          <q-toggle
            v-if="michi_mode === 'pokedex'"
            v-model="michi_evolution_order"
            color="primary"
            label="Override order with evolution line"
          />
          <q-toggle
            v-if="michi_mode === 'pokedex' && michi_evolution_order && binder_columns >= 3"
            v-model="michi_line_focus"
            color="primary"
            label="Per-line focus"
          />
          <q-input v-model.number="michi_seed" type="number" dark outlined label="Variation seed" />
          <q-btn
            color="primary"
            text-color="dark"
            icon="auto_awesome"
            label="Generate preview"
            :loading="michi_generating"
            no-caps
            @click="generate_michi_proposal()"
            ><q-tooltip :delay="1000">Generate preview</q-tooltip></q-btn
          >
          <q-btn
            v-if="michi_proposal"
            outline
            color="primary"
            icon="shuffle"
            label="Try another variation"
            :disable="michi_generating"
            no-caps
            @click="generate_michi_proposal(true)"
            ><q-tooltip :delay="1000">Try another variation</q-tooltip></q-btn
          >
        </div>
        <div class="michi-preview">
          <q-banner v-if="michi_error" class="status_error text-white rounded-borders q-mb-md">
            {{ michi_error }}
          </q-banner>
          <template v-if="michi_proposal">
            <q-banner
              v-for="warning in michi_proposal.warnings"
              :key="warning"
              class="status_warning text-white rounded-borders q-mb-sm"
            >
              {{ warning }}
            </q-banner>
            <div class="text-subtitle2 q-mb-sm">Proposed binder</div>
            <div class="michi-page-list">
              <div
                v-for="spread in michi_preview_spreads"
                :key="spread.key"
                class="row q-col-gutter-md"
              >
                <div
                  v-for="side in spread.sides"
                  :key="side.side_index"
                  class="col-6"
                  :class="{ 'offset-6': spread.align === 'right' }"
                >
                  <div class="text-caption text-center text_secondary q-mb-xs">
                    Page {{ side.side_index + 1 }}
                  </div>
                  <div
                    class="michi-page"
                    :style="{ gridTemplateColumns: `repeat(${binder_columns}, 1fr)` }"
                  >
                    <div
                      v-for="decoration in side.decorations"
                      :key="decoration.image.id"
                      class="michi-decoration"
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
                      v-for="cell in side.cells"
                      :key="cell.index"
                      class="michi-cell"
                      :style="{ gridColumn: cell.column + 1, gridRow: cell.row + 1 }"
                    >
                      <img v-if="cell.image_url" :src="cell.image_url" :alt="cell.name" />
                      <q-icon v-else-if="cell.name" name="style" color="secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div
            v-else-if="!michi_error"
            class="full-height column items-center justify-center text_secondary text-center q-pa-xl"
          >
            <q-icon name="auto_awesome" size="48px" />
            <div class="q-mt-md">
              Choose the layout rules, then generate a non-destructive preview.
            </div>
          </div>
        </div>
      </q-card-section>
      <q-separator dark />
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          icon="check"
          label="Apply layout"
          :disable="!michi_proposal || michi_generating"
          no-caps
          @click="apply_michi_proposal"
          ><q-tooltip :delay="1000">Apply layout</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import utils
  import { binder_store, binder_slots_per_page } from '../../store/modules/binders';
  import { manual_image_store } from '../../store/modules/manual_images';
  import { generate_michi_layout } from '../../utils/michi_organizer';
  import { collection_store } from '../../store/modules/collection';
  import { get_pokemon } from '../../services/catalog_storage';
  import {
    group_pokemon_by_evolution,
    pokedex_targets,
    pokedex_requirement_id,
  } from '../../utils/pokedex_binder';

  // import types
  import type { Michi_Mode, Michi_Layout_Proposal } from '../../utils/michi_organizer';
  import type { Collection_Binder, Binder_Image } from '../../store/modules/binders';
  import type { Collection_Folder } from '../../models/collection';
  import type { Binder_Row } from '../../models/binder_view';

  /* hooks */
  const props = defineProps<{
    modelValue: boolean;
    folder_id: string;
    rows: Omit<Binder_Row, 'available'>[];
  }>();

  const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();

  /* const vars */
  const pokemon = get_pokemon();

  const michi_mode_options = [
    { label: 'Date first', value: 'date' },
    { label: 'Pokédex order', value: 'pokedex' },
    { label: 'Color first', value: 'color' },
  ];

  /* reactive vars */
  const michi_mode = ref<Michi_Mode>('date');

  const michi_evolution_order = ref<boolean>(false);

  const michi_line_focus = ref<boolean>(false);

  const michi_seed = ref<number>(1);

  const michi_generating = ref<boolean>(false);

  const michi_proposal = ref<Michi_Layout_Proposal | null>(null);

  const michi_error = ref<string | null>(null);

  /* computed vars */
  const show_michi_dialog = computed<boolean>({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

  const folder_id = computed<string>(() => props.folder_id);

  const folder = computed<Collection_Folder | null>(
    () => collection_store.folders.value.find((row) => row.id === folder_id.value) ?? null,
  );

  const binder = computed<Collection_Binder | null>(() => binder_store.get(folder_id.value));

  const base_rows = computed<Omit<Binder_Row, 'available'>[]>(() => props.rows);

  const binder_columns = computed<2 | 3>(() => (binder.value?.layout === '2x2' ? 2 : 3));

  const michi_preview_sides = computed<
    {
      side_index: number;
      cells: {
        name: string;
        image_url: string | null;
        index: number;
        row: number;
        column: number;
      }[];
      decorations: {
        image: Binder_Image;
        placement: { image_id: string; side_index: number; row: number; column: number };
      }[];
    }[]
  >(() => {
    if (!binder.value || !michi_proposal.value) return [];
    const side_size = binder_slots_per_page(binder.value.layout);
    const preview_slots = michi_proposal.value.slots;
    const preview_placements = michi_proposal.value.image_placements;
    return Array.from({ length: binder.value.page_count * 2 }, (_, side_index) => ({
      side_index: side_index,
      cells: preview_slots
        .slice(side_index * side_size, (side_index + 1) * side_size)
        .map((slot_value, index) => ({
          index,
          row: Math.floor(index / binder_columns.value),
          column: index % binder_columns.value,
          ...michi_preview_content(slot_value),
        })),
      decorations: preview_placements
        .filter((placement) => placement.side_index === side_index)
        .flatMap((placement) => {
          const image = binder.value?.images.find(
            (candidate) => candidate.id === placement.image_id,
          );
          return image ? [{ image, placement }] : [];
        }),
    }));
  });

  const michi_preview_spreads = computed<
    {
      key: string;
      sides: {
        side_index: number;
        cells: {
          name: string;
          image_url: string | null;
          index: number;
          row: number;
          column: number;
        }[];
        decorations: {
          image: Binder_Image;
          placement: { image_id: string; side_index: number; row: number; column: number };
        }[];
      }[];
      align: 'left' | 'right' | 'pair';
    }[]
  >(() => {
    const sides = michi_preview_sides.value;
    if (!sides.length) return [];
    const spreads: Array<{
      key: string;
      sides: typeof sides;
      align: 'left' | 'right' | 'pair';
    }> = [{ key: 'opening', sides: [sides[0]], align: 'right' }];
    for (let index = 1; index < sides.length; index += 2) {
      const spread_sides = sides.slice(index, index + 2);
      spreads.push({
        key: `spread-${index}`,
        sides: spread_sides,
        align: spread_sides.length === 1 ? 'left' : 'pair',
      });
    }
    return spreads;
  });

  /* functions */
  const binder_asset_url = (asset_id: string, kind: 'proxy' | 'image'): string => {
    const asset = manual_image_store.find('binder-assets', folder_id.value, asset_id, kind);
    return asset ? `${asset.url}?v=${encodeURIComponent(asset.updated_at)}` : '';
  };

  const pokedex_group_key_for_row = (row: Omit<Binder_Row, 'available'>): string | null => {
    if (folder.value?.pokedex_config) return row.entry.pokedex_requirement_id ?? null;
    if (row.pokedex_number === null) return null;
    return `pokemon:${row.pokedex_number}`;
  };

  const pokedex_generation = (number: number): number => {
    const generation_ends = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
    const generation_index = generation_ends.findIndex((end) => number <= end);
    return generation_index === -1 ? generation_ends.length + 1 : generation_index + 1;
  };

  const michi_pokedex_slots = (): Array<{
    key: string;
    order: number;
    name: string;
    generation: number;
    line_key?: string;
  }> => {
    const config = folder.value?.pokedex_config;
    if (config) {
      const targets = pokedex_targets(config);
      const evolution_groups = michi_evolution_order.value
        ? group_pokemon_by_evolution(targets)
        : [];
      const ordered_targets = evolution_groups.length ? evolution_groups.flat() : targets;
      const line_keys = new Map(
        evolution_groups.flatMap((group, group_index) =>
          group.map((entry) => [entry.id, `evolution-line:${group_index}`] as const),
        ),
      );
      const generations = new Map(
        evolution_groups.flatMap((group) => {
          const generation = pokedex_generation(
            Math.min(...group.map((entry) => entry.pokedex_id)),
          );
          return group.map((entry) => [entry.id, generation] as const);
        }),
      );
      return ordered_targets.map((entry, index) => ({
        key: pokedex_requirement_id(entry.id),
        order: index,
        name: entry.name,
        generation: generations.get(entry.id) ?? pokedex_generation(entry.pokedex_id),
        line_key: line_keys.get(entry.id),
      }));
    }
    const targets = pokemon.filter((entry) => entry.form === null);
    const evolution_groups = michi_evolution_order.value ? group_pokemon_by_evolution(targets) : [];
    const ordered_targets = evolution_groups.length ? evolution_groups.flat() : targets;
    const line_keys = new Map(
      evolution_groups.flatMap((group, group_index) =>
        group.map((entry) => [entry.id, `evolution-line:${group_index}`] as const),
      ),
    );
    const generations = new Map(
      evolution_groups.flatMap((group) => {
        const generation = pokedex_generation(Math.min(...group.map((entry) => entry.pokedex_id)));
        return group.map((entry) => [entry.id, generation] as const);
      }),
    );
    return ordered_targets.map((entry, index) => ({
      key: `pokemon:${entry.pokedex_id}`,
      order: index,
      name: entry.name,
      generation: generations.get(entry.id) ?? pokedex_generation(entry.pokedex_id),
      line_key: line_keys.get(entry.id),
    }));
  };

  const generate_michi_proposal = async (next_variation = false): Promise<void> => {
    if (!binder.value || michi_generating.value) return;
    if (next_variation) michi_seed.value += 1;
    michi_generating.value = true;
    michi_error.value = null;
    return generate_michi_layout({
      page_count: binder.value.page_count,
      layout: binder.value.layout,
      current_slots: binder.value.slots,
      current_image_placements: binder.value.image_placements,
      cards: [
        ...base_rows.value.map((row) => ({
          slot_value: row.entry.id,
          name: row.card.display_name,
          image_url: row.card.image_url,
          date: row.release_date,
          group_key: `${row.entry.set_id}:${row.release_date ?? 'unknown'}`,
          set_order: row.card.number,
          undated_flexible: false,
          pokedex_order: row.pokedex_number,
          pokedex_group_key: pokedex_group_key_for_row(row),
          is_proxy: false,
          quantity: row.entry.quantity,
        })),
        ...binder.value.proxies.map((proxy) => ({
          slot_value: `proxy:${proxy.id}`,
          name: proxy.name,
          image_url: binder_asset_url(proxy.id, 'proxy') || null,
          date: proxy.date ?? null,
          group_key: `proxy:${proxy.id}:${proxy.date ?? 'unknown'}`,
          set_order: proxy.name,
          undated_flexible: !proxy.date,
          pokedex_order: null,
          pokedex_group_key: null,
          is_proxy: true,
          quantity: proxy.quantity,
        })),
      ],
      images: binder.value.images.map((image) => ({
        ...image,
        image_url: binder_asset_url(image.id, 'image'),
      })),
      pokedex_slots: michi_mode.value === 'pokedex' ? michi_pokedex_slots() : [],
      options: {
        mode: michi_mode.value,
        locked_pages: binder.value.locked_pages,
        seed: Math.floor(michi_seed.value) || 1,
        pokedex_line_focus: michi_line_focus.value && binder_columns.value >= 3,
      },
    })
      .then((res) => {
        michi_proposal.value = res;
      })
      .catch((err) => {
        michi_proposal.value = null;
        michi_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        michi_generating.value = false;
      });
  };

  const michi_preview_content = (
    slot_value: string | null,
  ): { name: string; image_url: string | null } => {
    if (!slot_value) return { name: '', image_url: null };
    if (slot_value.startsWith('proxy:')) {
      const proxy_id = slot_value.slice(6);
      const proxy = binder.value?.proxies.find((candidate) => candidate.id === proxy_id);
      return {
        name: proxy?.name ?? 'Proxy',
        image_url: binder_asset_url(proxy_id, 'proxy') || null,
      };
    }
    const row = base_rows.value.find((candidate) => candidate.entry.id === slot_value);
    return { name: row?.card.display_name ?? 'Card', image_url: row?.card.image_url ?? null };
  };

  const apply_michi_proposal = (): void => {
    if (!binder.value || !michi_proposal.value) return;
    binder_store.apply_layout(
      folder_id.value,
      michi_proposal.value.slots,
      michi_proposal.value.image_placements,
    );
    show_michi_dialog.value = false;
  };

  /* watchers */
  watch(
    () => props.modelValue,
    (value) => {
      if (value) {
        michi_proposal.value = null;
        michi_error.value = null;
      }
    },
  );
</script>
