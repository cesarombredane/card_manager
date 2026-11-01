<template>
  <q-btn
    flat
    round
    dense
    color="primary"
    icon="picture_as_pdf"
    :disable="selected_image_ids.length === 0"
    :loading="images_pdf_saving"
    no-caps
    aria-label="Print selected binder images"
    @click="print_selected_images"
    ><q-tooltip :delay="1000">Download selected images at Vault X pocket size</q-tooltip></q-btn
  >
  <div v-if="images_pdf_error" class="text-negative text-caption q-mt-sm" role="alert">
    {{ images_pdf_error }}
  </div>
</template>
<script setup lang="ts">
  // import hooks
  import { computed, ref } from 'vue';

  // import utils
  import { download_binder_images_pdf } from '../../utils/binder_images_pdf';
  import { manual_image_store } from '../../store/modules/manual_images';
  import { collection_store } from '../../store/modules/collection';
  import { binder_store } from '../../store/modules/binders';

  // import types
  import type { Collection_Folder } from '../../models/collection';
  import type { Collection_Binder } from '../../models/binders';

  /* hooks */
  const props = defineProps<{ folder_id: string; selected_image_ids: string[] }>();

  /* reactive vars */
  const images_pdf_saving = ref<boolean>(false);

  const images_pdf_error = ref<string | null>(null);

  /* computed vars */
  const binder = computed<Collection_Binder | null>(() => binder_store.get(props.folder_id));

  const folder = computed<Collection_Folder | null>(
    () => collection_store.folders.value.find((row) => row.id === props.folder_id) ?? null,
  );

  /* functions */
  const binder_asset_url = (id: string, kind: 'image'): string => {
    const asset = manual_image_store.find('binder-assets', props.folder_id, id, kind);
    return asset ? asset.url + '?v=' + encodeURIComponent(asset.updated_at) : '';
  };

  const print_selected_images = async (): Promise<void> => {
    if (!binder.value || !folder.value) return;
    images_pdf_saving.value = true;
    images_pdf_error.value = null;
    return download_binder_images_pdf(
      folder.value.name,
      binder.value.images
        .filter((image) => props.selected_image_ids.includes(image.id))
        .map((image) => ({ ...image, url: binder_asset_url(image.id, 'image') })),
    )
      .catch((err) => {
        images_pdf_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        images_pdf_saving.value = false;
      });
  };
</script>
