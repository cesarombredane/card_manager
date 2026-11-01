<template>
  <q-btn-toggle
    v-model="selected_language_id"
    :options="language_options"
    :disable="disable"
    color="dark"
    padding="sm md"
    text-color="secondary"
    toggle-color="primary"
    toggle-text-color="white"
    unelevated
  />
</template>

<script setup lang="ts">
  // import hooks
  import { computed } from 'vue';

  // import utils
  import { get_languages } from '../services/catalog_storage';

  // import types
  import type { Language } from '../models/catalog';
  import type { ComputedRef } from 'vue';

  /* types */
  // A language selector option formatted for q-btn-toggle.

  type Language_Option = {
    label: string;
    value: string;
  };

  /* hooks */
  // Component props used to render and update the selected language.

  const props = defineProps<{
    modelValue: string;
    language_ids: string[];
    include_all?: boolean;
    disable?: boolean;
  }>();

  // Component event used by v-model.
  const emit = defineEmits<{
    (event: 'update:modelValue', language_id: string): void;
  }>();

  /* const vars */
  // Languages configured in local data.

  const languages: Language[] = get_languages();

  /* computed vars */
  // Selected language proxied to the parent v-model.

  const selected_language_id = computed<string>({
    get: (): string => props.modelValue,
    set: (language_id: string): void => emit('update:modelValue', language_id),
  });

  // Language options displayed in the toggle.
  const language_options: ComputedRef<Language_Option[]> = computed<
    { label: string; value: string }[]
  >(() => [
    ...(props.include_all ? [{ label: 'all', value: 'all' }] : []),
    ...props.language_ids.map((language_id) => ({
      label: get_language_label(language_id),
      value: language_id,
    })),
  ]);

  /* functions */
  // Returns a compact label for a language id.

  const get_language_label = (language_id: string): string => {
    const language: Language | undefined = languages.find((item) => item.id === language_id);
    return language?.id ?? language_id;
  };
</script>
