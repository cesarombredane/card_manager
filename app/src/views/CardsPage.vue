<template>
  <q-page class="bg-dark text-white q-pa-md q-pa-lg-md">
    <div class="column q-gutter-lg">
      <page-header title="Advanced card search" eyebrow="Cards" description="Filter concepts by language, artist, category, and variants." />
      <q-card flat bordered class="bg-grey-10">
        <q-card-section class="row q-col-gutter-md">
          <q-input v-model="filters.q" class="col-12 col-md-4" dark outlined label="Name, text, number, set" />
          <q-input v-model="filters.language" class="col-6 col-md-2" dark outlined label="Language code" />
          <q-input v-model="filters.artist" class="col-6 col-md-2" dark outlined label="Artist" />
          <q-select v-model="filters.cardCategory" class="col-6 col-md-2" dark outlined clearable label="Category"
            :options="['pokemon', 'trainer', 'energy', 'unknown']" />
          <q-select v-model="filters.variantType" class="col-6 col-md-2" dark outlined clearable label="Variant"
            :options="['normal', 'holo', 'reverse_holo', 'stamped', 'first_edition']" />
          <div class="col-12">
            <q-btn color="primary" label="Search cards" no-caps :loading="loading" @click="load" />
          </div>
        </q-card-section>
      </q-card>
      <q-banner v-if="error" class="bg-negative text-white">{{ error }}</q-banner>
      <result-list :items="results">
        <template #default="{ item }">
          <div class="row items-center justify-between q-gutter-md no-wrap">
            <div class="row items-center q-gutter-md">
              <q-img v-if="item.image_preview" :src="item.image_preview" width="56px" height="78px" fit="contain" class="bg-grey-9" />
              <div>
                <router-link class="text-primary text-subtitle1" :to="`/card-concepts/${item.id}`">{{ item.canonical_name || 'Unnamed concept' }}</router-link>
                <div class="text-caption text-grey-5">{{ item.card_category }} · {{ item.artist || 'Unknown artist' }}</div>
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-chip square color="grey-9" text-color="white">{{ item.print_count }} prints</q-chip>
              <q-chip square color="grey-9" text-color="white">{{ item.language_count }} languages</q-chip>
              <q-chip square color="grey-9" text-color="white">{{ item.variant_count }} variants</q-chip>
            </div>
          </div>
        </template>
      </result-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue';

  import { apiGet, type ApiRecord } from '../api/client';
  import PageHeader from '../components/PageHeader.vue';
  import ResultList from '../components/ResultList.vue';

  const filters = ref({ q: '', language: '', artist: '', cardCategory: '', variantType: '' });
  const results = ref<ApiRecord[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      const payload = await apiGet<{ results: ApiRecord[] }>('/api/cards/search', { ...filters.value, limit: 10 });
      results.value = payload.results ?? [];
    } catch (requestError: unknown) {
      error.value = requestError instanceof Error ? requestError.message : String(requestError);
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);
</script>
