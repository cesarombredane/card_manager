<script setup>
  import { onMounted, ref } from 'vue';

  const apiStatus = ref('checking');

  onMounted(async () => {
    try {
      const response = await fetch('/api/health');
      const health = await response.json();
      apiStatus.value = health.status;
    } catch {
      apiStatus.value = 'offline';
    }
  });
</script>

<template>
  <main class="app-shell">
    <section class="workspace">
      <p class="eyebrow">Card Manager aze</p>
      <h1>Collection workspace</h1>
      <p class="intro">
        Vue is ready for the frontend, Express is ready for the API, and the database pod can be wired in next.
      </p>

      <div class="status-grid" aria-label="Application services">
        <article class="status-card">
          <span class="status-label">Frontend</span>
          <strong>Vue 3</strong>
          <small>Running through Vite during development.</small>
        </article>

        <article class="status-card">
          <span class="status-label">Backend</span>
          <strong>Express</strong>
          <small>API health: {{ apiStatus }}</small>
        </article>

        <article class="status-card">
          <span class="status-label">Database</span>
          <strong>PostgreSQL</strong>
          <small>Planned as a separate Kubernetes pod.</small>
        </article>
      </div>
    </section>
  </main>
</template>
