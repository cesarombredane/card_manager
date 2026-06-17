// import vue-router
import { createRouter, createWebHistory } from 'vue-router';

// import views
import SeriesListingPage from '../views/SeriesListingPage.vue';
import HomePage from '../views/HomePage.vue';


// create router instance
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/series',
      name: 'series',
      component: SeriesListingPage
    }
  ]
});
