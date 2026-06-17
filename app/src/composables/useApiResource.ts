import { onMounted, ref } from 'vue';
import type { Ref } from 'vue';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useApiResource<T = Record<string, any>>(loader: () => Promise<T>): {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string>;
  load: () => Promise<void>;
} {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';

    try {
      data.value = await loader();
    } catch (requestError: unknown) {
      error.value = getErrorMessage(requestError);
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
