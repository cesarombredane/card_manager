<template>
  <q-btn
    flat
    color="secondary"
    icon="download"
    label="Export"
    no-caps
    :loading="exporting"
    @click="export_personal_data"
    ><q-tooltip :delay="1000">Export</q-tooltip></q-btn
  >
  <q-btn
    flat
    color="secondary"
    icon="upload"
    label="Import"
    no-caps
    :disable="importing"
    @click="import_file_input?.click()"
    ><q-tooltip :delay="1000">Import</q-tooltip></q-btn
  >
  <input
    ref="import_file_input"
    type="file"
    accept=".zip,application/zip"
    hidden
    @change="select_import_file"
  />
  <q-dialog :model-value="import_file !== null" persistent>
    <q-card class="app_surface text-white" style="width: 520px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Import personal data?</div>
        <div class="text-body2 text_secondary q-mt-sm">{{ import_file?.name }}</div>
      </q-card-section>
      <q-card-section>
        <q-banner class="status_error text-white rounded-borders">
          <template #avatar><q-icon name="warning" color="white" /></template>
          This will permanently replace every collection, binder, manual card, proxy, decorative
          image, and personal card image currently stored in Card Manager.
        </q-banner>
        <div v-if="backup_error" class="text-negative q-mt-md">{{ backup_error }}</div>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn
          flat
          color="secondary"
          label="Cancel"
          :disable="importing"
          no-caps
          @click="cancel_import"
          ><q-tooltip :delay="1000">Cancel</q-tooltip></q-btn
        >
        <q-btn
          color="negative"
          label="Overwrite and import"
          :loading="importing"
          no-caps
          @click="import_personal_data"
          ><q-tooltip :delay="1000">Overwrite and import</q-tooltip></q-btn
        >
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-banner
    v-if="backup_error && !import_file"
    class="status_error text-white q-mt-lg rounded-borders"
  >
    {{ backup_error }}
  </q-banner>
</template>
<script setup lang="ts">
  // import hooks
  import { ref } from 'vue';

  // import utils
  import {
    export_personal_data as request_personal_export,
    import_personal_data as request_personal_import,
  } from '../../services/personal_data';

  /* reactive vars */
  const import_file_input = ref<HTMLInputElement | null>(null);

  const import_file = ref<File | null>(null);

  const importing = ref<boolean>(false);

  const exporting = ref<boolean>(false);

  const backup_error = ref<string | null>(null);

  /* functions */
  const response_error = async (response: Response, fallback: string): Promise<string> => {
    try {
      const body: unknown = await response.json();
      return body !== null &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
        ? body.error
        : fallback;
    } catch {
      return fallback;
    }
  };

  const export_personal_data = (): Promise<void> => {
    exporting.value = true;
    backup_error.value = null;
    return request_personal_export()
      .then(async (res) => {
        if (!res.ok) throw new Error(await response_error(res, 'Unable to export personal data'));
        const blob = await res.blob();
        const content_disposition = res.headers.get('Content-Disposition') ?? '';
        const filename =
          /filename="([^"]+)"/.exec(content_disposition)?.[1] ?? 'card-manager-backup.zip';
        const url = URL.createObjectURL(blob);
        try {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
        } finally {
          URL.revokeObjectURL(url);
        }
      })
      .catch((err) => {
        backup_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        exporting.value = false;
      });
  };

  const select_import_file = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    import_file.value = input.files?.[0] ?? null;
    backup_error.value = null;
  };

  const cancel_import = (): void => {
    import_file.value = null;
    if (import_file_input.value) import_file_input.value.value = '';
    backup_error.value = null;
  };

  const import_personal_data = async (): Promise<void> => {
    if (!import_file.value) return;
    importing.value = true;
    backup_error.value = null;
    return request_personal_import(import_file.value)
      .then(async (res) => {
        if (!res.ok) throw new Error(await response_error(res, 'Unable to import personal data'));
        window.location.reload();
      })
      .catch((err) => {
        backup_error.value = err instanceof Error ? err.message : String(err);
      })
      .finally(() => {
        importing.value = false;
      });
  };
</script>
