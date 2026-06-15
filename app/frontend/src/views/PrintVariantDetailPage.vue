<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.variant.variant_type" eyebrow="Variant" :description="print?.printed_name || 'Card print'" />
      <result-list :items="images" empty-title="No images"><template #default="{ item }">
          <div class="row items-center q-gutter-md"><q-img :src="item.image_url" width="72px" height="100px" fit="contain" class="bg-grey-9" />
            <div>
              <div class="text-primary">{{ item.image_url }}</div>
              <div class="text-caption text-grey-5">{{ item.width }}x{{ item.height }} · {{ item.image_source }}</div>
            </div>
          </div>
        </template></result-list>
    </div>
  </q-page>
</template>


<script setup lang="ts">
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { apiGet } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';
  import { useApiResource } from '../composables/useApiResource';
  const route = useRoute();
  const { data, loading, error } = useApiResource(() => apiGet(`/api/print-variants/${route.params.id}`));
  const images = computed(() => data.value?.images ?? []);
  const print = computed(() => data.value?.variant?.print ?? null);
</script>
