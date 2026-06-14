<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { apiGet } from '../api/client';
import PageHeader from '../components/PageHeader.vue';
import ResultList from '../components/ResultList.vue';
import { useApiResource } from '../composables/useApiResource';
const route = useRoute();
const { data, loading, error } = useApiResource(() => apiGet(`/api/print-variants/${route.params.id}`));
const images = computed(() => data.value?.images ?? []);
</script>
<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.variant.variant_type" eyebrow="Variant" :description="data.print.printed_name" />
      <result-list :items="images" empty-title="No images"><template #default="{ item }"><div class="text-primary">{{ item.image_url }}</div><div class="text-caption text-grey-5">{{ item.width }}x{{ item.height }} · {{ item.image_source }}</div></template></result-list>
    </div>
  </q-page>
</template>
