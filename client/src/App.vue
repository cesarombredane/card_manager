<script setup>
import { computed, onMounted, reactive, ref } from "vue";

const cards = ref([]);
const loading = ref(true);
const saving = ref(false);
const csvFile = ref(null);
const form = reactive({
  name: "",
  setName: "",
  cardNumber: "",
  rarity: "",
  condition: "",
  quantity: 1,
  notes: "",
  image: null
});

const totalCards = computed(() =>
  cards.value.reduce((total, card) => total + Number(card.quantity || 0), 0)
);

async function loadCards() {
  loading.value = true;
  const response = await fetch("/api/cards");
  cards.value = await response.json();
  loading.value = false;
}

function resetForm() {
  form.name = "";
  form.setName = "";
  form.cardNumber = "";
  form.rarity = "";
  form.condition = "";
  form.quantity = 1;
  form.notes = "";
  form.image = null;
}

function setImage(event) {
  form.image = event.target.files?.[0] || null;
}

function setCsvFile(event) {
  csvFile.value = event.target.files?.[0] || null;
}

async function addCard() {
  saving.value = true;
  const body = new FormData();

  for (const [key, value] of Object.entries(form)) {
    if (value !== null && value !== "") {
      body.append(key, value);
    }
  }

  await fetch("/api/cards", {
    method: "POST",
    body
  });
  resetForm();
  await loadCards();
  saving.value = false;
}

async function deleteCard(card) {
  await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
  await loadCards();
}

async function importCsv() {
  if (!csvFile.value) {
    return;
  }

  const body = new FormData();
  body.append("file", csvFile.value);

  await fetch("/api/cards/import.csv", {
    method: "POST",
    body
  });
  csvFile.value = null;
  await loadCards();
}

onMounted(loadCards);
</script>

<template>
  <main class="shell">
    <section class="toolbar">
      <div>
        <p class="eyebrow">Collection</p>
        <h1>Pokemon Card Manager</h1>
      </div>
      <div class="stats">
        <span>{{ cards.length }} unique</span>
        <span>{{ totalCards }} total</span>
      </div>
    </section>

    <section class="workspace">
      <form class="panel" @submit.prevent="addCard">
        <h2>Add a card</h2>
        <label>
          Name
          <input v-model="form.name" required placeholder="Pikachu" />
        </label>
        <label>
          Set
          <input v-model="form.setName" placeholder="Base Set" />
        </label>
        <div class="grid-two">
          <label>
            Number
            <input v-model="form.cardNumber" placeholder="58/102" />
          </label>
          <label>
            Quantity
            <input v-model.number="form.quantity" min="1" type="number" />
          </label>
        </div>
        <div class="grid-two">
          <label>
            Rarity
            <input v-model="form.rarity" placeholder="Common" />
          </label>
          <label>
            Condition
            <input v-model="form.condition" placeholder="Near Mint" />
          </label>
        </div>
        <label>
          Notes
          <textarea v-model="form.notes" rows="3" placeholder="Sleeved, binder page 2"></textarea>
        </label>
        <label>
          Image
          <input accept="image/*" type="file" @change="setImage" />
        </label>
        <button :disabled="saving" type="submit">{{ saving ? "Saving..." : "Add card" }}</button>
      </form>

      <section class="collection">
        <div class="collection-actions">
          <h2>Your cards</h2>
          <div class="csv-actions">
            <a class="button secondary" href="/api/cards/export.csv">Export CSV</a>
            <label class="file-button">
              Import CSV
              <input accept=".csv,text/csv" type="file" @change="setCsvFile" />
            </label>
            <button class="secondary" :disabled="!csvFile" type="button" @click="importCsv">Upload</button>
          </div>
        </div>

        <p v-if="loading" class="empty">Loading collection...</p>
        <p v-else-if="cards.length === 0" class="empty">No cards yet.</p>

        <div v-else class="card-grid">
          <article v-for="card in cards" :key="card.id" class="card">
            <img v-if="card.hasImage" :src="card.imageUrl" :alt="card.name" />
            <div v-else class="image-placeholder">No image</div>
            <div class="card-body">
              <div>
                <h3>{{ card.name }}</h3>
                <p>{{ card.setName || "Unknown set" }} {{ card.cardNumber }}</p>
              </div>
              <dl>
                <div>
                  <dt>Qty</dt>
                  <dd>{{ card.quantity }}</dd>
                </div>
                <div>
                  <dt>Rarity</dt>
                  <dd>{{ card.rarity || "-" }}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>{{ card.condition || "-" }}</dd>
                </div>
              </dl>
              <p v-if="card.notes" class="notes">{{ card.notes }}</p>
              <button class="danger" type="button" @click="deleteCard(card)">Delete</button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>
