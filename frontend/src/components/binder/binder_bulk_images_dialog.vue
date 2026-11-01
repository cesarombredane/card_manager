<template>
  <q-dialog v-model="show_bulk_image_dialog">
    <q-card class="app_surface text-white" style="width: 560px; max-width: 92vw">
      <q-card-section>
        <div class="text-h6">Add multiple binder images</div>
        <div class="text-body2 text_secondary">
          Each image gets a generic name and the closest slot size for its proportions.
        </div>
      </q-card-section>
      <q-card-section class="column q-gutter-md">
        <q-file
          v-model="bulk_image_files"
          multiple
          dark
          outlined
          use-chips
          counter
          accept="image/jpeg,image/png,image/webp"
          label="Choose images"
          :disable="bulk_image_saving"
          @update:model-value="prepare_bulk_images"
        >
          <template #prepend><q-icon name="collections" /></template>
        </q-file>
        <q-list v-if="bulk_image_rows.length" bordered separator class="rounded-borders">
          <q-item v-for="row in bulk_image_rows" :key="`${row.file.name}-${row.file.lastModified}`">
            <q-item-section avatar>
              <q-icon
                :name="
                  row.status === 'done'
                    ? 'check_circle'
                    : row.status === 'error'
                      ? 'error'
                      : 'image'
                "
                :color="
                  row.status === 'done'
                    ? 'positive'
                    : row.status === 'error'
                      ? 'negative'
                      : 'secondary'
                "
              />
            </q-item-section>
            <q-item-section>
              <q-item-label lines="1">{{ row.file.name }}</q-item-label>
              <q-item-label caption>
                {{ row.width }} × {{ row.height }} slots
                <span v-if="row.status === 'uploading'"> · Uploading…</span>
                <span v-else-if="row.error" class="text-negative"> · {{ row.error }}</span>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-if="bulk_image_error" class="text-negative">{{ bulk_image_error }}</div>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn
          v-close-popup
          flat
          color="secondary"
          label="Cancel"
          :disable="bulk_image_saving"
          no-caps
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="primary"
          text-color="dark"
          label="Add all"
          :disable="!bulk_image_rows.some((row) => row.status === 'ready') || bulk_image_preparing"
          :loading="bulk_image_saving || bulk_image_preparing"
          no-caps
          @click="save_bulk_images"
          ><q-tooltip :delay="1000">Add all</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref, watch } from 'vue';

  // import utils
  import { manual_image_store } from '../../store/modules/manual_images';
  import { binder_store } from '../../store/modules/binders';
  import {
    load_image_file,
    center_crop_image,
    optimized_image_source,
  } from '../../utils/image_processing';

  // import types
  import type { Collection_Binder } from '../../models/binders';

  /* types */
  type Bulk_Image_Row = {
    file: File;
    width: number;
    height: number;
    status: 'ready' | 'uploading' | 'done' | 'error';
    error: string | null;
  };

  /* hooks */
  const props = defineProps<{ modelValue: boolean; folder_id: string }>();

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

  /* reactive vars */
  const bulk_image_files = ref<File[] | null>(null);

  const bulk_image_rows = ref<Bulk_Image_Row[]>([]);

  const bulk_image_preparing = ref<boolean>(false);

  const bulk_image_saving = ref<boolean>(false);

  const bulk_image_error = ref<string | null>(null);

  /* computed vars */
  const folder_id = computed<string>(() => props.folder_id);

  const show_bulk_image_dialog = computed<boolean>({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

  const binder = computed<Collection_Binder | null>(() => binder_store.get(props.folder_id));

  const asset_dimensions = computed<number[]>(() =>
    Array.from({ length: binder.value?.layout === '2x2' ? 2 : 3 }, (_, index) => index + 1),
  );

  /* functions */
  const best_image_dimensions = (image_aspect: number): { width: number; height: number } => {
    let best = { width: 1, height: 1 };
    let best_difference = Number.POSITIVE_INFINITY;
    for (const width of asset_dimensions.value) {
      for (const height of asset_dimensions.value) {
        const slot_aspect = (width * 8) / (height * 11);
        const difference = Math.abs(Math.log(image_aspect / slot_aspect));
        const same_difference = Math.abs(difference - best_difference) < 1e-9;
        if (
          (difference < best_difference && !same_difference) ||
          (same_difference && width * height > best.width * best.height)
        ) {
          best = { width, height };
          best_difference = difference;
        }
      }
    }
    return best;
  };

  const prepare_bulk_images = async (files: File[] | null): Promise<void> => {
    bulk_image_rows.value = [];
    bulk_image_error.value = null;
    if (!files?.length) return;
    bulk_image_preparing.value = true;
    const rows: Bulk_Image_Row[] = [];
    for (const file of files) {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 15_000_000
      ) {
        rows.push({
          file,
          width: 1,
          height: 1,
          status: 'error',
          error: 'Unsupported format or larger than 15 MB',
        });
        continue;
      }
      try {
        const image = await load_image_file(file);
        rows.push({
          file,
          ...best_image_dimensions(image.naturalWidth / image.naturalHeight),
          status: 'ready',
          error: null,
        });
      } catch (err) {
        rows.push({
          file,
          width: 1,
          height: 1,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    bulk_image_rows.value = rows;
    bulk_image_preparing.value = false;
  };

  const next_generic_image_number = (): number => {
    const used = new Set(
      (binder.value?.images ?? []).flatMap((image) => {
        const match = /^Image (\d+)$/.exec(image.name);
        return match ? [Number(match[1])] : [];
      }),
    );
    let number = 1;
    while (used.has(number)) number += 1;
    return number;
  };

  const save_bulk_images = async (): Promise<void> => {
    if (!binder.value || bulk_image_saving.value) return;
    bulk_image_saving.value = true;
    bulk_image_error.value = null;
    let generic_number = next_generic_image_number();
    let failed = bulk_image_rows.value.filter((row) => row.status === 'error').length;
    for (const row of bulk_image_rows.value) {
      if (row.status === 'error' || row.status === 'done') continue;
      row.status = 'uploading';
      const asset = binder_store.create_image(
        folder_id.value,
        `Image ${generic_number}`,
        row.width,
        row.height,
      );
      try {
        const source_image = await load_image_file(row.file);
        const data_url = await center_crop_image(row.file, row.width, row.height);
        await manual_image_store.upload({
          set_id: 'binder-assets',
          card_id: folder_id.value,
          variant_id: asset.id,
          language_id: 'image-source',
          data_url: optimized_image_source(source_image),
        });
        await manual_image_store.upload({
          set_id: 'binder-assets',
          card_id: folder_id.value,
          variant_id: asset.id,
          language_id: 'image',
          data_url: data_url,
        });
        row.status = 'done';
        generic_number += 1;
      } catch (err) {
        binder_store.remove_asset(folder_id.value, 'image', asset.id);
        await manual_image_store
          .remove('binder-assets', folder_id.value, asset.id, 'image-source')
          .catch(() => undefined);
        row.status = 'error';
        row.error = err instanceof Error ? err.message : String(err);
        failed += 1;
      }
    }
    bulk_image_saving.value = false;
    if (failed) {
      bulk_image_error.value = `${failed} image${failed === 1 ? '' : 's'} could not be added.`;
    } else {
      show_bulk_image_dialog.value = false;
    }
  };

  /* watchers */
  watch(
    () => props.modelValue,
    (value) => {
      if (value) {
        bulk_image_files.value = null;
        bulk_image_rows.value = [];
        bulk_image_error.value = null;
      }
    },
  );
</script>
