<template>
  <q-dialog
    :model-value="modelValue"
    aria-labelledby="confirmation_title"
    aria-describedby="confirmation_message"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="confirmation_card">
      <q-card-section>
        <h2 id="confirmation_title" class="text-h6 q-my-none">{{ title }}</h2>
        <p id="confirmation_message" class="text_secondary q-mt-md q-mb-none">{{ message }}</p>
        <slot />
      </q-card-section>

      <q-card-actions class="q-pa-md">
        <q-space />
        <q-btn v-close-popup flat no-caps :label="cancel_label" @click="emit('cancel')">
          <q-tooltip :delay="1000">{{ cancel_tooltip }}</q-tooltip>
        </q-btn>
        <q-btn
          unelevated
          no-caps
          :label="confirm_label"
          :color="destructive ? 'negative' : 'primary'"
          :text-color="destructive ? 'white' : 'dark'"
          @click="confirm"
        >
          <q-tooltip :delay="1000">{{ confirm_tooltip }}</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  /* hooks */
  defineProps<{
    modelValue: boolean;
    title: string;
    message: string;
    confirm_label: string;
    cancel_label: string;
    confirm_tooltip: string;
    cancel_tooltip: string;
    destructive?: boolean;
  }>();

  const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirm: [];
    cancel: [];
  }>();

  /* functions */
  function confirm(): void {
    emit('confirm');
    emit('update:modelValue', false);
  }
</script>
