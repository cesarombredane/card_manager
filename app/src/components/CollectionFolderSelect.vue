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
  import { computed } from 'vue';
  import type { CollectionFolder } from '../utils/collection';

  defineOptions({ inheritAttrs: false });

  const props = defineProps<{
    modelValue: string;
    folders: CollectionFolder[];
  }>();
  defineEmits<{ 'update:modelValue': [value: string] }>();

  const options = computed(() => [...props.folders]
    .sort((left, right) => {
      const typeRank = (folder: CollectionFolder): number => folder.type === 'box' ? 0 : 1;
      return typeRank(left) - typeRank(right)
        || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    })
    .map((folder) => ({
      label: folder.name,
      value: folder.id,
      icon: folder.type === 'box' ? 'inventory' : 'auto_stories',
      caption: folder.type === 'box' ? 'Box' : 'Binder'
    })));
</script>
