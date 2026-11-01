<template>
  <q-dialog v-model="show_asset_dialog">
    <q-card class="app_surface text-white" style="width: 500px; max-width: 92vw">
      <q-card-section>
        <div class="text-h6">Add {{ asset_kind === 'proxy' ? 'proxy card' : 'binder image' }}</div>
        <div class="text-body2 text_secondary">
          {{
            asset_kind === 'proxy'
              ? 'A proxy occupies one card slot and does not enter your collection.'
              : 'The image sits behind slots, so cards can be placed on top.'
          }}
        </div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <q-input
          v-model="asset_name"
          dark
          outlined
          :label="asset_kind === 'proxy' ? 'Proxy name' : 'Image name'"
        />
        <template v-if="asset_kind === 'proxy'">
          <q-input
            v-model="asset_date"
            dark
            outlined
            label="Date (optional)"
            mask="##/##/####"
            placeholder="DD/MM/YYYY"
            :error="!is_valid_proxy_date(asset_date)"
            error-message="Use a valid DD/MM/YYYY date"
          />
          <q-input
            v-model.number="asset_quantity"
            type="number"
            min="1"
            step="1"
            dark
            outlined
            label="Quantity"
          />
        </template>
        <div v-if="asset_kind === 'image'">
          <div class="row q-gutter-md no-wrap items-start">
            <div class="col">
              <q-select
                v-model="asset_width"
                class="full-width"
                :options="asset_dimensions"
                dark
                outlined
                label="Width in slots"
              />
            </div>
            <div class="col">
              <q-select
                v-model="asset_height"
                class="full-width"
                :options="asset_dimensions"
                dark
                outlined
                label="Height in slots"
              />
            </div>
          </div>
        </div>
        <q-file
          v-model="asset_file"
          dark
          outlined
          accept="image/jpeg,image/png,image/webp"
          label="Choose image"
          @update:model-value="prepare_asset_image"
        >
          <template #prepend><q-icon name="image" /></template>
        </q-file>
        <div v-if="asset_preview" class="crop-editor">
          <div class="text-subtitle2">Crop and position</div>
          <div class="text-caption text_secondary q-mb-sm">
            The highlighted frame is the exact proportion used in the binder.
          </div>
          <div class="crop-frame" :style="crop_frame_style">
            <canvas ref="crop_canvas" class="crop-canvas" />
          </div>
          <q-slider
            v-model="crop_zoom"
            :min="1"
            :max="3"
            :step="0.01"
            label
            label-always
            :label-value="`Zoom ${crop_zoom.toFixed(2)}×`"
          />
          <div class="crop-position-control">
            <div class="row items-center no-wrap">
              <q-icon name="swap_horiz" class="q-mr-sm" />
              <span class="text-caption">Horizontal position</span>
              <span v-if="!can_crop_x" class="text-caption text_secondary q-ml-auto"
                >Zoom in to move</span
              >
            </div>
            <q-slider v-model="crop_x" :min="-100" :max="100" :disable="!can_crop_x" />
          </div>
          <div class="crop-position-control">
            <div class="row items-center no-wrap">
              <q-icon name="swap_vert" class="q-mr-sm" />
              <span class="text-caption">Vertical position</span>
              <span v-if="!can_crop_y" class="text-caption text_secondary q-ml-auto"
                >Zoom in to move</span
              >
            </div>
            <q-slider v-model="crop_y" :min="-100" :max="100" :disable="!can_crop_y" />
          </div>
        </div>
        <div v-if="asset_error" class="text-negative">{{ asset_error }}</div>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn v-close-popup flat color="secondary" label="Cancel" no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Add"
          :disable="
            !asset_name.trim() ||
            !asset_data_url ||
            (asset_kind === 'proxy' && (asset_quantity < 1 || !is_valid_proxy_date(asset_date)))
          "
          :loading="asset_saving"
          no-caps
          @click="save_asset"
          ><q-tooltip :delay="1000">Add</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref, nextTick, watch } from 'vue';

  // import utils
  import { manual_image_store } from '../../store/modules/manual_images';
  import { optimized_image_source } from '../../utils/image_processing';
  import { is_valid_proxy_date } from '../../utils/proxy_date';
  import { binder_store } from '../../store/modules/binders';

  // import types
  import type { Collection_Binder } from '../../store/modules/binders';

  /* hooks */
  const props = defineProps<{ folder_id: string }>();

  /* computed vars */
  const folder_id = computed<string>(() => props.folder_id);

  const binder = computed<Collection_Binder | null>(() => binder_store.get(folder_id.value));

  const binder_columns = computed<2 | 3>(() => (binder.value?.layout === '2x2' ? 2 : 3));

  /* reactive vars */
  const show_asset_dialog = ref<boolean>(false);

  const asset_kind = ref<'proxy' | 'image'>('proxy');

  const asset_name = ref<string>('');

  const asset_quantity = ref<number>(1);

  const asset_date = ref<string>('');

  const asset_width = ref<number>(1);

  const asset_height = ref<number>(1);

  const asset_file = ref<File | null>(null);

  const asset_data_url = ref<string | null>(null);

  const asset_preview = ref<string | null>(null);

  const asset_error = ref<string | null>(null);

  const asset_saving = ref<boolean>(false);

  const crop_canvas = ref<HTMLCanvasElement | null>(null);

  const crop_image = ref<HTMLImageElement | null>(null);

  const crop_zoom = ref<number>(1);

  const crop_x = ref<number>(0);

  const crop_y = ref<number>(0);

  /* computed vars */
  const asset_dimensions = computed<number[]>(() =>
    Array.from({ length: binder_columns.value }, (_, index) => index + 1),
  );

  /* functions */
  const open_asset_dialog = (tab: string): void => {
    asset_kind.value = tab === 'images' ? 'image' : 'proxy';
    asset_name.value = '';
    asset_quantity.value = 1;
    asset_date.value = '';
    asset_width.value = 1;
    asset_height.value = 1;
    asset_file.value = null;
    asset_data_url.value = null;
    asset_preview.value = null;
    asset_error.value = null;
    crop_image.value = null;
    crop_zoom.value = 1;
    crop_x.value = 0;
    crop_y.value = 0;
    show_asset_dialog.value = true;
  };

  /* computed vars */
  const crop_aspect = computed<number>(() =>
    asset_kind.value === 'proxy' ? 8 / 11 : (asset_width.value * 8) / (asset_height.value * 11),
  );

  const crop_frame_style = computed<{ aspectRatio: string; width: string }>(() => ({
    aspectRatio: String(crop_aspect.value),
    width: `min(100%, ${crop_aspect.value * 360}px)`,
  }));

  const crop_source_size = computed<{ width: number; height: number }>(() => {
    const image = crop_image.value;
    if (!image) return { width: 0, height: 0 };
    const image_aspect = image.naturalWidth / image.naturalHeight;
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (image_aspect > crop_aspect.value) width = image.naturalHeight * crop_aspect.value;
    else height = image.naturalWidth / crop_aspect.value;
    return {
      width: width / crop_zoom.value,
      height: height / crop_zoom.value,
    };
  });

  const can_crop_x = computed<boolean>(() =>
    Boolean(crop_image.value && crop_image.value.naturalWidth - crop_source_size.value.width > 0.5),
  );

  const can_crop_y = computed<boolean>(() =>
    Boolean(
      crop_image.value && crop_image.value.naturalHeight - crop_source_size.value.height > 0.5,
    ),
  );

  /* functions */
  const prepare_asset_image = (file: File | null): void => {
    asset_data_url.value = null;
    asset_preview.value = null;
    asset_error.value = null;
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
      asset_error.value = 'Choose a JPEG, PNG, or WebP image smaller than 15 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      asset_data_url.value = typeof reader.result === 'string' ? reader.result : null;
      asset_preview.value = asset_data_url.value;
      if (!asset_data_url.value) return;
      const image = new Image();
      image.onload = () => {
        crop_image.value = image;
        void nextTick(render_crop);
      };
      image.onerror = () => {
        asset_error.value = 'Unable to decode the selected image.';
      };
      image.src = asset_data_url.value;
    };
    reader.onerror = () => {
      asset_error.value = 'Unable to read the selected image.';
    };
    reader.readAsDataURL(file);
  };

  const save_asset = async (): Promise<void> => {
    if (!binder.value || !asset_name.value.trim() || !asset_data_url.value || !crop_canvas.value)
      return;
    asset_saving.value = true;
    asset_error.value = null;
    const asset =
      asset_kind.value === 'proxy'
        ? binder_store.create_proxy(
            folder_id.value,
            asset_name.value,
            asset_quantity.value,
            asset_date.value,
          )
        : binder_store.create_image(
            folder_id.value,
            asset_name.value,
            asset_width.value,
            asset_height.value,
          );
    try {
      const cropped_data_url = crop_canvas.value.toDataURL('image/jpeg', 0.92);
      if (asset_kind.value === 'image' && crop_image.value) {
        await manual_image_store.upload({
          set_id: 'binder-assets',
          card_id: folder_id.value,
          variant_id: asset.id,
          language_id: 'image-source',
          data_url: optimized_image_source(crop_image.value),
        });
      }
      await manual_image_store.upload({
        set_id: 'binder-assets',
        card_id: folder_id.value,
        variant_id: asset.id,
        language_id: asset_kind.value,
        data_url: cropped_data_url,
      });
      if (asset_kind.value === 'image') {
        binder_store.update_image(folder_id.value, asset.id, {
          name: asset_name.value,
          width: asset_width.value,
          height: asset_height.value,
          card_slots: [],
          crop_zoom: crop_zoom.value,
          crop_x: crop_x.value,
          crop_y: crop_y.value,
        });
      }
      show_asset_dialog.value = false;
    } catch (error) {
      binder_store.remove_asset(folder_id.value, asset_kind.value, asset.id);
      if (asset_kind.value === 'image') {
        await manual_image_store
          .remove('binder-assets', folder_id.value, asset.id, 'image-source')
          .catch(() => undefined);
      }
      asset_error.value = error instanceof Error ? error.message : String(error);
    } finally {
      asset_saving.value = false;
    }
  };

  const render_crop = (): void => {
    const canvas = crop_canvas.value;
    const image = crop_image.value;
    if (!canvas || !image) return;
    const output_width = crop_aspect.value >= 1 ? 900 : Math.round(900 * crop_aspect.value);
    const output_height = crop_aspect.value >= 1 ? Math.round(900 / crop_aspect.value) : 900;
    canvas.width = output_width;
    canvas.height = output_height;
    const source_width = crop_source_size.value.width;
    const source_height = crop_source_size.value.height;
    const available_x = image.naturalWidth - source_width;
    const available_y = image.naturalHeight - source_height;
    const source_x = available_x * ((crop_x.value + 100) / 200);
    const source_y = available_y * ((crop_y.value + 100) / 200);
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

  /* watchers */
  watch([crop_zoom, crop_x, crop_y, crop_aspect], () => render_crop());

  /* public methods */
  defineExpose({ open: open_asset_dialog });
</script>
