<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { apiGet } from '../api/client';
import PageHeader from '../components/PageHeader.vue';
import ResultList from '../components/ResultList.vue';
import { useApiResource } from '../composables/useApiResource';
const route = useRoute();
const { data, loading, error } = useApiResource(() => apiGet(`/api/card-prints/${route.params.id}`));
const variants = computed(() => data.value?.variants ?? []);
</script>
<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.print.printed_name" eyebrow="Print" :description="`${data.language.code} · ${data.set.name} · ${data.print.card_number || ''}`" />
      <result-list :items="variants" empty-title="No variants"><template #default="{ item }"><router-link class="text-primary" :to="`/print-variants/${item.id}`">{{ item.variant_type }}</router-link><div class="text-caption text-grey-5">{{ item.foil_type || 'No foil' }} · {{ item.edition || 'No edition' }}</div></template></result-list>
    </div>
  </q-page>
</template>
