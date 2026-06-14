<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { apiGet } from '../api/client';
import PageHeader from '../components/PageHeader.vue';
import ResultList from '../components/ResultList.vue';
import { useApiResource } from '../composables/useApiResource';
const route = useRoute();
const { data, loading, error } = useApiResource(() => apiGet(`/api/card-concepts/${route.params.id}`));
const prints = computed(() => data.value?.prints ?? []);
const texts = computed(() => data.value?.texts ?? []);
</script>
<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <q-inner-loading :showing="loading" />
    <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
    <div v-if="data" class="column q-gutter-lg">
      <page-header :title="data.concept.canonical_name || 'Card concept'" eyebrow="Concept" :description="`${data.concept.card_category} · ${data.concept.artist || 'Unknown artist'}`" />
      <q-card flat bordered class="bg-grey-10"><q-card-section><div class="text-h6">Texts</div><div v-for="text in texts" :key="text.id" class="q-mt-sm"><q-chip square color="grey-9" text-color="white">{{ text.language_code }}</q-chip> {{ text.name }}</div></q-card-section></q-card>
      <result-list :items="prints" empty-title="No prints"><template #default="{ item }"><router-link class="text-primary" :to="`/card-prints/${item.id}`">{{ item.printed_name }}</router-link><div class="text-caption text-grey-5">{{ item.language_code }} · {{ item.set_name }} · {{ item.card_number }}</div></template></result-list>
    </div>
  </q-page>
</template>
