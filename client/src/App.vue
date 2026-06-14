<script setup>
  import { computed, onMounted, reactive, ref } from "vue";

  const activeView = ref("series");
  const loading = ref(false);
  const saving = ref(false);

  const series = ref([]);
  const sets = ref([]);
  const cards = ref([]);
  const collectedCards = ref([]);
  const modifiers = ref([]);
  const pokemon = ref([]);

  const selectedSeries = ref(null);
  const selectedSet = ref(null);

  const setSearch = ref("");
  const cardFilters = reactive({
    name: "",
    cardId: "",
    setId: "",
    pokemonId: ""
  });

  const seriesForm = reactive({ name: "", image: null });
  const setForm = reactive({ name: "", seriesId: "", language: "", image: null });
  const pokemonForm = reactive({ name: "", pokedexId: "", image: null });
  const cardForm = reactive({
    name: "",
    number: "",
    setId: "",
    modifierCode: "normal",
    pokemonId: "",
    pokemonName: "",
    pokedexId: "",
    image: null
  });
  const collectedForm = reactive({
    cardId: "",
    condition: "",
    note: "",
    quantity: 1,
    image: null
  });

  const visibleSets = computed(() => {
    return sets.value.filter((set) => {
      const matchesSeries = selectedSeries.value ? set.seriesId === selectedSeries.value.id : true;
      const matchesSearch = setSearch.value
        ? set.name.toLowerCase().includes(setSearch.value.toLowerCase())
        : true;
      return matchesSeries && matchesSearch;
    });
  });

  const visibleCards = computed(() => {
    return cards.value.filter((card) => {
      const matchesSet = selectedSet.value ? card.setId === selectedSet.value.id : true;
      return matchesSet;
    });
  });

  async function fetchJson(url, options) {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed." }));
      throw new Error(error.message || "Request failed.");
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function loadAll() {
    loading.value = true;
    const [seriesData, setsData, cardsData, collectionData, modifiersData, pokemonData] =
      await Promise.all([
        fetchJson("/api/series"),
        fetchJson("/api/sets"),
        fetchJson("/api/cards"),
        fetchJson("/api/collection"),
        fetchJson("/api/modifiers"),
        fetchJson("/api/pokemon")
      ]);

    series.value = seriesData;
    sets.value = setsData;
    cards.value = cardsData;
    collectedCards.value = collectionData;
    modifiers.value = modifiersData;
    pokemon.value = pokemonData;
    loading.value = false;
  }

  function fileFrom(event) {
    return event.target.files?.[0] || null;
  }

  function bodyFrom(values, imageField = "image") {
    const body = new FormData();

    for (const [key, value] of Object.entries(values)) {
      if (value !== null && value !== "") {
        body.append(key === "image" ? imageField : key, value);
      }
    }

    return body;
  }

  async function createSeries() {
    saving.value = true;
    await fetchJson("/api/series", {
      method: "POST",
      body: bodyFrom(seriesForm)
    });
    seriesForm.name = "";
    seriesForm.image = null;
    await loadAll();
    saving.value = false;
  }

  async function createSet() {
    saving.value = true;
    await fetchJson("/api/sets", {
      method: "POST",
      body: bodyFrom(setForm)
    });
    setForm.name = "";
    setForm.language = "";
    setForm.image = null;
    await loadAll();
    saving.value = false;
  }

  async function createPokemon() {
    saving.value = true;
    await fetchJson("/api/pokemon", {
      method: "POST",
      body: bodyFrom(pokemonForm)
    });
    pokemonForm.name = "";
    pokemonForm.pokedexId = "";
    pokemonForm.image = null;
    await loadAll();
    saving.value = false;
  }

  async function createCard() {
    saving.value = true;
    await fetchJson("/api/cards", {
      method: "POST",
      body: bodyFrom(cardForm, "cardImage")
    });
    cardForm.name = "";
    cardForm.number = "";
    cardForm.image = null;
    await loadAll();
    saving.value = false;
  }

  async function createCollectedCard() {
    saving.value = true;
    await fetchJson("/api/collection", {
      method: "POST",
      body: bodyFrom(collectedForm, "collectedImage")
    });
    collectedForm.condition = "";
    collectedForm.note = "";
    collectedForm.quantity = 1;
    collectedForm.image = null;
    await loadAll();
    activeView.value = "collection";
    saving.value = false;
  }

  async function searchCards() {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(cardFilters)) {
      if (value) {
        params.set(key, value);
      }
    }

    cards.value = await fetchJson(`/api/cards?${params.toString()}`);
    selectedSet.value = cardFilters.setId
      ? sets.value.find((set) => set.id === Number(cardFilters.setId)) || null
      : null;
    activeView.value = "cards";
  }

  async function deleteCollectedCard(card) {
    await fetchJson(`/api/collection/${card.id}`, { method: "DELETE" });
    await loadAll();
  }

  function openSeries(item) {
    selectedSeries.value = item;
    selectedSet.value = null;
    activeView.value = "sets";
  }

  function openSet(item) {
    selectedSet.value = item;
    cardFilters.setId = item.id;
    activeView.value = "cards";
  }

  onMounted(loadAll);
</script>

<template>
  <main class="shell">
    <section class="toolbar">
      <div>
        <p class="eyebrow">Collection</p>
        <h1>Pokemon Card Manager</h1>
      </div>
      <nav class="tabs" aria-label="Views">
        <button :class="{ active: activeView === 'series' }" type="button" @click="activeView = 'series'">
          Series
        </button>
        <button :class="{ active: activeView === 'sets' }" type="button" @click="activeView = 'sets'">
          Sets
        </button>
        <button :class="{ active: activeView === 'cards' }" type="button" @click="activeView = 'cards'">
          Cards
        </button>
        <button :class="{ active: activeView === 'add-collected' }" type="button" @click="activeView = 'add-collected'">
          Add collected
        </button>
        <button :class="{ active: activeView === 'collection' }" type="button" @click="activeView = 'collection'">
          Collection
        </button>
      </nav>
    </section>

    <p v-if="loading" class="empty">Loading collection...</p>

    <section v-show="activeView === 'series'" class="workspace">
      <form class="panel" @submit.prevent="createSeries">
        <h2>Add series</h2>
        <label>
          Name
          <input v-model="seriesForm.name" required placeholder="Mega Evolution" />
        </label>
        <label>
          Image
          <input accept="image/*" type="file" @change="seriesForm.image = fileFrom($event)" />
        </label>
        <button :disabled="saving" type="submit">Save series</button>
      </form>

      <section class="collection">
        <h2>Series</h2>
        <div class="card-grid">
          <button v-for="item in series" :key="item.id" class="browse-card" type="button" @click="openSeries(item)">
            <img v-if="item.hasImage" :src="item.imageUrl" :alt="item.name" />
            <span v-else class="image-placeholder">No image</span>
            <strong>{{ item.name }}</strong>
          </button>
        </div>
      </section>
    </section>

    <section v-show="activeView === 'sets'" class="workspace">
      <form class="panel" @submit.prevent="createSet">
        <h2>Add set</h2>
        <label>
          Series
          <select v-model="setForm.seriesId" required>
            <option value="">Select series</option>
            <option v-for="item in series" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label>
          Name
          <input v-model="setForm.name" required placeholder="Base Set" />
        </label>
        <label>
          Language
          <input v-model="setForm.language" placeholder="English" />
        </label>
        <label>
          Image
          <input accept="image/*" type="file" @change="setForm.image = fileFrom($event)" />
        </label>
        <button :disabled="saving" type="submit">Save set</button>
      </form>

      <section class="collection">
        <div class="collection-actions">
          <h2>{{ selectedSeries ? selectedSeries.name : "Sets" }}</h2>
          <input v-model="setSearch" class="search" placeholder="Search sets" />
        </div>
        <div class="card-grid">
          <button v-for="item in visibleSets" :key="item.id" class="browse-card" type="button" @click="openSet(item)">
            <img v-if="item.hasImage" :src="item.imageUrl" :alt="item.name" />
            <span v-else class="image-placeholder">No image</span>
            <strong>{{ item.name }}</strong>
            <small>{{ item.seriesName }} {{ item.language }}</small>
          </button>
        </div>
      </section>
    </section>

    <section v-show="activeView === 'cards'" class="workspace">
      <form class="panel" @submit.prevent="createCard">
        <h2>Add catalog card</h2>
        <label>
          Set
          <select v-model="cardForm.setId" required>
            <option value="">Select set</option>
            <option v-for="item in sets" :key="item.id" :value="item.id">
              {{ item.seriesName }} - {{ item.name }}
            </option>
          </select>
        </label>
        <label>
          Name
          <input v-model="cardForm.name" required placeholder="Pikachu" />
        </label>
        <div class="grid-two">
          <label>
            Number
            <input v-model="cardForm.number" required placeholder="58/102" />
          </label>
          <label>
            Modifier
            <select v-model="cardForm.modifierCode">
              <option v-for="item in modifiers" :key="item.id" :value="item.code">{{ item.name }}</option>
            </select>
          </label>
        </div>
        <label>
          Pokemon
          <select v-model="cardForm.pokemonId">
            <option value="">No Pokemon</option>
            <option v-for="item in pokemon" :key="item.id" :value="item.id">
              #{{ item.pokedexId }} {{ item.name }}
            </option>
          </select>
        </label>
        <div class="grid-two">
          <label>
            New Pokemon
            <input v-model="cardForm.pokemonName" placeholder="Mew" />
          </label>
          <label>
            Pokedex ID
            <input v-model="cardForm.pokedexId" min="1" type="number" />
          </label>
        </div>
        <label>
          Image
          <input accept="image/*" type="file" @change="cardForm.image = fileFrom($event)" />
        </label>
        <button :disabled="saving" type="submit">Save card</button>
      </form>

      <section class="collection">
        <div class="filters">
          <input v-model="cardFilters.name" placeholder="Card name" />
          <input v-model="cardFilters.cardId" placeholder="Card ID" />
          <select v-model="cardFilters.setId">
            <option value="">All sets</option>
            <option v-for="item in sets" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <select v-model="cardFilters.pokemonId">
            <option value="">All Pokemon</option>
            <option v-for="item in pokemon" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <button type="button" @click="searchCards">Search</button>
        </div>

        <h2>{{ selectedSet ? selectedSet.name : "Cards" }}</h2>
        <div class="card-grid">
          <article v-for="card in visibleCards" :key="card.id" class="card">
            <img v-if="card.hasImage" :src="card.imageUrl" :alt="card.name" />
            <div v-else class="image-placeholder">No image</div>
            <div class="card-body">
              <h3>{{ card.name }}</h3>
              <p>{{ card.setName }} {{ card.cardNumber }}</p>
              <p>{{ card.modifierName }} · {{ card.pokemonName || "No Pokemon" }}</p>
              <p>{{ card.collectedCount }} collected</p>
            </div>
          </article>
        </div>
      </section>
    </section>

    <section v-show="activeView === 'add-collected'" class="workspace narrow">
      <form class="panel" @submit.prevent="createCollectedCard">
        <h2>Add collected card</h2>
        <label>
          Card
          <select v-model="collectedForm.cardId" required>
            <option value="">Select card</option>
            <option v-for="card in cards" :key="card.id" :value="card.id">
              {{ card.name }} - {{ card.setName }} {{ card.cardNumber }}
            </option>
          </select>
        </label>
        <div class="grid-two">
          <label>
            Quantity
            <input v-model.number="collectedForm.quantity" min="1" type="number" />
          </label>
          <label>
            Condition
            <input v-model="collectedForm.condition" placeholder="Near Mint" />
          </label>
        </div>
        <label>
          Note
          <textarea v-model="collectedForm.note" rows="3" placeholder="Sleeved, binder page 2"></textarea>
        </label>
        <label>
          Owned-card image
          <input accept="image/*" type="file" @change="collectedForm.image = fileFrom($event)" />
        </label>
        <button :disabled="saving" type="submit">Add to collection</button>
      </form>
    </section>

    <section v-show="activeView === 'collection'" class="collection">
      <div class="collection-actions">
        <h2>Collected cards</h2>
        <a class="button secondary" href="/api/collection/export.csv">Export CSV</a>
      </div>
      <div class="card-grid">
        <article v-for="card in collectedCards" :key="card.id" class="card">
          <img v-if="card.hasCollectedImage" :src="card.collectedImageUrl" :alt="card.name" />
          <img v-else-if="card.hasImage" :src="card.imageUrl" :alt="card.name" />
          <div v-else class="image-placeholder">No image</div>
          <div class="card-body">
            <h3>{{ card.name }}</h3>
            <p>{{ card.setName }} {{ card.cardNumber }}</p>
            <p>{{ card.condition || "No condition" }} · {{ card.pokemonName || "No Pokemon" }}</p>
            <p v-if="card.note" class="notes">{{ card.note }}</p>
            <button class="danger" type="button" @click="deleteCollectedCard(card)">Delete</button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
