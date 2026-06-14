import { onMounted, ref } from 'vue';

export function useApiResource(loader) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      data.value = await loader();
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);

  return {
    data,
    loading,
    error,
    load
  };
}
