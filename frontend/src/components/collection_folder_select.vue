<template>
  <q-select
    :model-value="modelValue"
    :options="options"
    emit-value
    map-options
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section avatar>
          <q-icon :name="scope.opt.icon" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ scope.opt.label }}</q-item-label>
          <q-item-label v-if="scope.opt.caption" caption>{{ scope.opt.caption }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
    <template #selected-item="scope">
      <div class="row items-center no-wrap q-gutter-sm">
        <q-icon :name="scope.opt.icon" />
        <span>{{ scope.opt.label }}</span>
      </div>
    </template>
  </q-select>
</template>

<script setup lang="ts">
  // import hooks
  import { computed } from 'vue';

  // import types
  import type { Collection_Folder } from '../store/modules/collection';

  /* hooks */
  defineOptions({ inheritAttrs: false });

  const props = defineProps<{
    modelValue: string;
    folders: Collection_Folder[];
  }>();

  /* computed vars */
  const options = computed<{ label: string; value: string; icon: string; caption: string }[]>(() =>
    [...props.folders]
      .sort((left, right) => {
        const type_rank = (folder: Collection_Folder): number => (folder.type === 'box' ? 0 : 1);
        return (
          type_rank(left) - type_rank(right) ||
          left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
        );
      })
      .map((folder) => ({
        label: folder.name,
        value: folder.id,
        icon: folder.type === 'box' ? 'inventory' : 'auto_stories',
        caption: folder.type === 'box' ? 'Box' : 'Binder',
      })),
  );

  /* initialization */
  defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
