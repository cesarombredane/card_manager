<template>
  <q-dialog v-model="show_edit_asset_dialog">
    <q-card
      class="app_surface text-white"
      style="width: 600px; max-width: 92vw; max-height: 90vh; overflow-y: auto"
    >
      <q-card-section>
        <div class="text-h6">Edit {{ edit_asset_kind === 'proxy' ? 'proxy' : 'image' }}</div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <q-input v-model="edit_name" dark outlined label="Name" autofocus />
        <template v-if="edit_asset_kind === 'proxy'">
          <q-input
            v-model="edit_date"
            dark
            outlined
            label="Date (optional)"
            mask="##/##/####"
            placeholder="DD/MM/YYYY"
            :error="!is_valid_proxy_date(edit_date)"
            error-message="Use a valid DD/MM/YYYY date"
          />
          <q-input
            v-model.number="edit_quantity"
            type="number"
            min="1"
            step="1"
            dark
            outlined
            label="Quantity"
          />
        </template>
        <div v-else>
          <div class="row q-gutter-md no-wrap items-start">
            <div class="col">
              <q-select
                v-model="edit_width"
                class="full-width"
                :options="asset_dimensions"
                dark
                outlined
                label="Width in slots"
                @update:model-value="reset_edit_card_slots"
              />
            </div>
            <div class="col">
              <q-select
                v-model="edit_height"
                class="full-width"
                :options="asset_dimensions"
                dark
                outlined
                label="Height in slots"
                @update:model-value="reset_edit_card_slots"
              />
            </div>
          </div>
          <div>
            <div class="text-subtitle2">Crop, position, and card areas</div>
            <div class="text-caption text_secondary q-mb-sm">
              Select the image areas where a card may be placed. Unselected areas remain reserved
              for the illustration.
            </div>
            <div class="crop-frame" :style="edit_crop_frame_style">
              <canvas ref="edit_crop_canvas" class="crop-canvas" />
              <div
                class="crop-slot-grid"
                :style="{
                  gridTemplateColumns: `repeat(${edit_width}, 1fr)`,
                  gridTemplateRows: `repeat(${edit_height}, 1fr)`,
                }"
              >
                <button
                  v-for="index in edit_width * edit_height"
                  :key="index"
                  type="button"
                  class="crop-slot-toggle"
                  :class="{ 'crop-slot-toggle--selected': edit_card_slots.includes(index - 1) }"
                  :aria-label="`${edit_card_slots.includes(index - 1) ? 'Disallow' : 'Allow'} card in image area ${index}`"
                  @click="toggle_edit_card_slot(index - 1)"
                >
                  <q-icon :name="edit_card_slots.includes(index - 1) ? 'style' : 'block'" />
                </button>
              </div>
            </div>
            <q-slider
              v-model="edit_crop_zoom"
              :min="1"
              :max="3"
              :step="0.01"
              label
              label-always
              :label-value="`Zoom ${edit_crop_zoom.toFixed(2)}×`"
            />
            <div class="crop-position-control">
              <div class="row items-center no-wrap">
                <q-icon name="swap_horiz" class="q-mr-sm" />
                <span class="text-caption">Horizontal position</span>
                <span v-if="!can_edit_crop_x" class="text-caption text_secondary q-ml-auto"
                  >Zoom in to move</span
                >
              </div>
              <q-slider v-model="edit_crop_x" :min="-100" :max="100" :disable="!can_edit_crop_x" />
            </div>
            <div class="crop-position-control">
              <div class="row items-center no-wrap">
                <q-icon name="swap_vert" class="q-mr-sm" />
                <span class="text-caption">Vertical position</span>
                <span v-if="!can_edit_crop_y" class="text-caption text_secondary q-ml-auto"
                  >Zoom in to move</span
                >
              </div>
              <q-slider v-model="edit_crop_y" :min="-100" :max="100" :disable="!can_edit_crop_y" />
            </div>
          </div>
          <div v-if="edit_asset_error" class="text-negative">{{ edit_asset_error }}</div>
          <q-banner
            v-if="edit_reserved_slot_conflicts"
            class="status_error text-white rounded-borders"
          >
            {{ edit_reserved_slot_conflicts }} occupied card
            {{ edit_reserved_slot_conflicts === 1 ? 'slot is' : 'slots are' }} marked as
            illustration-only. Remove those cards or allow cards in those areas before saving.
          </q-banner>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Save"
          :disable="
            !edit_name.trim() ||
            edit_quantity < 1 ||
            edit_reserved_slot_conflicts > 0 ||
            (edit_asset_kind === 'proxy' && !is_valid_proxy_date(edit_date))
          "
          :loading="edit_asset_saving"
          no-caps
          @click="save_asset_edits"
          ><q-tooltip :delay="1000">Save</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref, nextTick, watch } from 'vue';

  // import utils
  import { binder_slots_per_page, binder_store } from '../../store/modules/binders';
  import { manual_image_store } from '../../store/modules/manual_images';
  import { optimized_image_source } from '../../utils/image_processing';
  import { is_valid_proxy_date } from '../../utils/proxy_date';

  // import types
  import type { Collection_Binder, Binder_Image, Binder_Proxy } from '../../store/modules/binders';

  /* hooks */
  const props = defineProps<{
    folder_id: string;
    is_locked: (kind: 'proxy' | 'image', id: string) => boolean;
  }>();

  /* reactive vars */
  const show_edit_asset_dialog = ref<boolean>(false);

  const edit_asset_kind = ref<'proxy' | 'image'>('proxy');

  const edit_asset_id = ref<string>('');

  const edit_name = ref<string>('');

  const edit_quantity = ref<number>(1);

  const edit_date = ref<string>('');

  const edit_width = ref<number>(1);

  const edit_height = ref<number>(1);

  const edit_original_width = ref<number>(1);

  const edit_original_height = ref<number>(1);

  const edit_card_slots = ref<number[]>([]);

  const edit_crop_canvas = ref<HTMLCanvasElement | null>(null);

  const edit_crop_image = ref<HTMLImageElement | null>(null);

  const edit_crop_zoom = ref<number>(1);

  const edit_crop_x = ref<number>(0);

  const edit_crop_y = ref<number>(0);

  const edit_original_crop_zoom = ref<number>(1);

  const edit_original_crop_x = ref<number>(0);

  const edit_original_crop_y = ref<number>(0);

  const edit_asset_saving = ref<boolean>(false);

  const edit_asset_error = ref<string | null>(null);

  /* computed vars */
  const folder_id = computed<string>(() => props.folder_id);

  const binder = computed<Collection_Binder | null>(() => binder_store.get(folder_id.value));

  const binder_columns = computed<2 | 3>(() => (binder.value?.layout === '2x2' ? 2 : 3));

  const asset_dimensions = computed<number[]>(() =>
    Array.from({ length: binder_columns.value }, (_, index) => index + 1),
  );

  const edit_reserved_slot_conflicts = computed<number>(() => {
    if (edit_asset_kind.value !== 'image' || !binder.value) return 0;
    const placement = binder.value.image_placements.find(
      (candidate) => candidate.image_id === edit_asset_id.value,
    );
    if (!placement) return 0;
    const dimension = binder_columns.value;
    const placed_row = Math.min(placement.row, dimension - edit_height.value);
    const placed_column = Math.min(placement.column, dimension - edit_width.value);
    let conflicts = 0;
    for (let row = 0; row < edit_height.value; row += 1) {
      for (let column = 0; column < edit_width.value; column += 1) {
        if (edit_card_slots.value.includes(row * edit_width.value + column)) continue;
        const slot_index =
          placement.side_index * binder_slots_per_page(binder.value.layout) +
          (placed_row + row) * dimension +
          placed_column +
          column;
        if (binder.value.slots[slot_index]) conflicts += 1;
      }
    }
    return conflicts;
  });

  const edit_crop_aspect = computed<number>(
    () => (edit_width.value * 8) / (edit_height.value * 11),
  );

  const edit_crop_frame_style = computed<{ aspectRatio: string; width: string }>(() => ({
    aspectRatio: String(edit_crop_aspect.value),
    width: `min(100%, ${edit_crop_aspect.value * 360}px)`,
  }));

  const edit_crop_source_size = computed<{ width: number; height: number }>(() => {
    const image = edit_crop_image.value;
    if (!image) return { width: 0, height: 0 };
    const image_aspect = image.naturalWidth / image.naturalHeight;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (image_aspect > edit_crop_aspect.value) width = image.naturalHeight * edit_crop_aspect.value;
    else height = image.naturalWidth / edit_crop_aspect.value;
    return { width: width / edit_crop_zoom.value, height: height / edit_crop_zoom.value };
  });

  const can_edit_crop_x = computed<boolean>(() =>
    Boolean(
      edit_crop_image.value &&
      edit_crop_image.value.naturalWidth - edit_crop_source_size.value.width > 0.5,
    ),
  );

  const can_edit_crop_y = computed<boolean>(() =>
    Boolean(
      edit_crop_image.value &&
      edit_crop_image.value.naturalHeight - edit_crop_source_size.value.height > 0.5,
    ),
  );

  /* functions */
  const is_asset_locked = (kind: 'proxy' | 'image', id: string): boolean =>
    props.is_locked(kind, id);

  const binder_asset_url = (asset_id: string, kind: 'proxy' | 'image'): string => {
    const asset = manual_image_store.find('binder-assets', folder_id.value, asset_id, kind);
    return asset ? `${asset.url}?v=${encodeURIComponent(asset.updated_at)}` : '';
  };

  const render_edit_crop = (): void => {
    const canvas = edit_crop_canvas.value;
    const image = edit_crop_image.value;
    if (!canvas || !image) return;
    const output_width =
      edit_crop_aspect.value >= 1 ? 900 : Math.round(900 * edit_crop_aspect.value);
    const output_height =
      edit_crop_aspect.value >= 1 ? Math.round(900 / edit_crop_aspect.value) : 900;
    canvas.width = output_width;
    canvas.height = output_height;
    const source_width = edit_crop_source_size.value.width;
    const source_height = edit_crop_source_size.value.height;
    const source_x = (image.naturalWidth - source_width) * ((edit_crop_x.value + 100) / 200);
    const source_y = (image.naturalHeight - source_height) * ((edit_crop_y.value + 100) / 200);
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, output_width, output_height);
    context?.drawImage(
      image,
      source_x,
      source_y,
      source_width,
      source_height,
      0,
      0,
      output_width,
      output_height,
    );
  };

  const reset_edit_card_slots = (): void => {
    edit_card_slots.value = [];
  };

  const toggle_edit_card_slot = (index: number): void => {
    edit_card_slots.value = edit_card_slots.value.includes(index)
      ? edit_card_slots.value.filter((candidate) => candidate !== index)
      : [...edit_card_slots.value, index].sort((left, right) => left - right);
  };

  const open_edit_asset = (kind: 'proxy' | 'image', asset_id: string): void => {
    if (is_asset_locked(kind, asset_id)) return;
    const asset =
      kind === 'proxy'
        ? binder.value?.proxies.find((candidate) => candidate.id === asset_id)
        : binder.value?.images.find((candidate) => candidate.id === asset_id);
    if (!asset) return;
    edit_asset_kind.value = kind;
    edit_asset_id.value = asset_id;
    edit_name.value = asset.name;
    edit_asset_error.value = null;
    if (kind === 'proxy') {
      const proxy = asset as Binder_Proxy;
      edit_quantity.value = proxy.quantity;
      edit_date.value = proxy.date ?? '';
    } else {
      const image = asset as Binder_Image;
      edit_width.value = image.width;
      edit_height.value = image.height;
      edit_original_width.value = image.width;
      edit_original_height.value = image.height;
      edit_card_slots.value = [...image.card_slots];
      edit_crop_zoom.value = image.crop_zoom;
      edit_crop_x.value = image.crop_x;
      edit_crop_y.value = image.crop_y;
      edit_original_crop_zoom.value = image.crop_zoom;
      edit_original_crop_x.value = image.crop_x;
      edit_original_crop_y.value = image.crop_y;
      edit_crop_image.value = null;
      edit_quantity.value = 1;
    }
    show_edit_asset_dialog.value = true;
    if (kind === 'image') {
      const source = new Image();
      source.onload = () => {
        edit_crop_image.value = source;
        void nextTick(render_edit_crop);
      };
      source.onerror = () => {
        edit_asset_error.value = 'Unable to load the existing image for cropping.';
      };
      const original = manual_image_store.find(
        'binder-assets',
        folder_id.value,
        asset_id,
        'image-source',
      );
      source.src = original
        ? `${original.url}?v=${encodeURIComponent(original.updated_at)}`
        : binder_asset_url(asset_id, 'image');
    }
  };

  const save_asset_edits = async (): Promise<void> => {
    if (!edit_name.value.trim() || is_asset_locked(edit_asset_kind.value, edit_asset_id.value))
      return;
    if (edit_asset_kind.value === 'proxy') {
      binder_store.update_proxy(folder_id.value, edit_asset_id.value, {
        name: edit_name.value,
        quantity: edit_quantity.value,
        date: edit_date.value,
      });
    } else {
      edit_asset_saving.value = true;
      edit_asset_error.value = null;
      try {
        const needs_recrop =
          edit_width.value !== edit_original_width.value ||
          edit_height.value !== edit_original_height.value ||
          edit_crop_zoom.value !== edit_original_crop_zoom.value ||
          edit_crop_x.value !== edit_original_crop_x.value ||
          edit_crop_y.value !== edit_original_crop_y.value;
        if (needs_recrop) {
          if (!edit_crop_canvas.value || !edit_crop_image.value)
            throw new Error('The image is not ready for cropping.');
          if (
            !manual_image_store.find(
              'binder-assets',
              folder_id.value,
              edit_asset_id.value,
              'image-source',
            )
          ) {
            await manual_image_store.upload({
              set_id: 'binder-assets',
              card_id: folder_id.value,
              variant_id: edit_asset_id.value,
              language_id: 'image-source',
              data_url: optimized_image_source(edit_crop_image.value),
            });
          }
          await manual_image_store.upload({
            set_id: 'binder-assets',
            card_id: folder_id.value,
            variant_id: edit_asset_id.value,
            language_id: 'image',
            data_url: edit_crop_canvas.value.toDataURL('image/jpeg', 0.92),
          });
        }
        binder_store.update_image(folder_id.value, edit_asset_id.value, {
          name: edit_name.value,
          width: edit_width.value,
          height: edit_height.value,
          card_slots: edit_card_slots.value,
          crop_zoom: edit_crop_zoom.value,
          crop_x: edit_crop_x.value,
          crop_y: edit_crop_y.value,
        });
      } catch (err) {
        edit_asset_error.value = err instanceof Error ? err.message : String(err);
        edit_asset_saving.value = false;
        return;
      }
      edit_asset_saving.value = false;
    }
    show_edit_asset_dialog.value = false;
  };

  /* watchers */
  watch([edit_crop_zoom, edit_crop_x, edit_crop_y, edit_crop_aspect], () => render_edit_crop());

  /* public methods */
  defineExpose({ open: open_edit_asset });
</script>
