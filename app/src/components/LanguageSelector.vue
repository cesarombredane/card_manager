<template>
  <q-btn-toggle
    v-model="selectedLanguageId"
    :options="languageOptions"
    color="grey-9"
    padding="sm md"
    text-color="grey-4"
    toggle-color="grey-7"
    toggle-text-color="white"
    unelevated
  />
</template>

<script setup lang="ts">
  // import hooks
  import { computed } from 'vue';

  // import utils
  import { getLanguages } from '../utils/dataManagement';
  import type { ComputedRef } from 'vue';
  import type { Language } from '../utils/types';


  /* types */
  // A language selector option formatted for q-btn-toggle.
  type LanguageOption = {
    label: string;
    value: string;
  };


  /* props */
  // Component props used to render and update the selected language.
  const props = defineProps<{
    modelValue: string;
    languageIds: string[];
    includeAll?: boolean;
  }>();

  // Component event used by v-model.
  const emit = defineEmits<{
    (event: 'update:modelValue', languageId: string): void;
  }>();


  /* constant vars */
  // Languages configured in local data.
  const languages: Language[] = getLanguages();


  /* reactive vars */
  // Selected language proxied to the parent v-model.
  const selectedLanguageId = computed({
    get: (): string => props.modelValue,
    set: (languageId: string): void => emit('update:modelValue', languageId)
  });


  /* computed vars */
  // Language options displayed in the toggle.
  const languageOptions: ComputedRef<LanguageOption[]> = computed(() => [
    ...(props.includeAll ? [{ label: 'all', value: 'all' }] : []),
    ...props.languageIds.map((languageId) => ({
      label: getLanguageLabel(languageId),
      value: languageId
    }))
  ]);


  /* methods */
  // Returns a compact label for a language id.
  const getLanguageLabel = (languageId: string): string => {
    const language: Language | undefined = languages.find((item) => item.id === languageId);
    return language?.id ?? languageId;
  };
</script>
