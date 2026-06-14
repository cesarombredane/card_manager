import { createRouter, createWebHistory } from 'vue-router';

import ArtistDetailPage from '../views/ArtistDetailPage.vue';
import ArtistsPage from '../views/ArtistsPage.vue';
import CardConceptDetailPage from '../views/CardConceptDetailPage.vue';
import CardPrintDetailPage from '../views/CardPrintDetailPage.vue';
import CardsPage from '../views/CardsPage.vue';
import ComparePage from '../views/ComparePage.vue';
import HomePage from '../views/HomePage.vue';
import LanguageDetailPage from '../views/LanguageDetailPage.vue';
import LanguagesPage from '../views/LanguagesPage.vue';
import PokemonDetailPage from '../views/PokemonDetailPage.vue';
import PokemonPage from '../views/PokemonPage.vue';
import PrintVariantDetailPage from '../views/PrintVariantDetailPage.vue';
import SearchPage from '../views/SearchPage.vue';
import SeriesDetailPage from '../views/SeriesDetailPage.vue';
import SeriesPage from '../views/SeriesPage.vue';
import SetDetailPage from '../views/SetDetailPage.vue';
import SetsPage from '../views/SetsPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/search',
      name: 'search',
      component: SearchPage
    },
    {
      path: '/cards',
      name: 'cards',
      component: CardsPage
    },
    {
      path: '/card-concepts/:id',
      name: 'card-concept-detail',
      component: CardConceptDetailPage
    },
    {
      path: '/card-prints/:id',
      name: 'card-print-detail',
      component: CardPrintDetailPage
    },
    {
      path: '/print-variants/:id',
      name: 'print-variant-detail',
      component: PrintVariantDetailPage
    },
    {
      path: '/sets',
      name: 'sets',
      component: SetsPage
    },
    {
      path: '/sets/:id',
      name: 'set-detail',
      component: SetDetailPage
    },
    {
      path: '/series',
      name: 'series',
      component: SeriesPage
    },
    {
      path: '/series/:id',
      name: 'series-detail',
      component: SeriesDetailPage
    },
    {
      path: '/languages',
      name: 'languages',
      component: LanguagesPage
    },
    {
      path: '/languages/:code',
      name: 'language-detail',
      component: LanguageDetailPage
    },
    {
      path: '/artists',
      name: 'artists',
      component: ArtistsPage
    },
    {
      path: '/artists/:name',
      name: 'artist-detail',
      component: ArtistDetailPage
    },
    {
      path: '/pokemon',
      name: 'pokemon',
      component: PokemonPage
    },
    {
      path: '/pokemon/:name',
      name: 'pokemon-detail',
      component: PokemonDetailPage
    },
    {
      path: '/compare',
      name: 'compare',
      component: ComparePage
    }
  ]
});
