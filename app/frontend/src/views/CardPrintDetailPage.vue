<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.print.printed_name" eyebrow="Print"
        :description="`${data.print.language.code} · ${data.print.set.name} · ${data.print.card_number || ''}`" />
      <div class="row q-col-gutter-lg">
        <div v-if="firstImage" class="col-12 col-sm-4 col-md-3">
          <q-img :src="firstImage.image_url" fit="contain" ratio="0.716" class="bg-grey-10" />
        </div>
        <div class="col-12 col-sm">
          <result-list :items="variants" empty-title="No variants"><template #default="{ item }"><router-link class="text-primary" :to="`/print-variants/${item.id}`">{{
            item.variant_type }}</router-link>
              <div class="text-caption text-grey-5">{{ item.foil_type || 'No foil' }} · {{ item.edition || 'No edition' }}</div>
            </template></result-list>
        </div>
      </div>
    </div>
  </q-page>
</template>

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
  const firstImage = computed(() => data.value?.images?.[0] ?? null);
</script>
