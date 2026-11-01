import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { i18n } from './i18n/index.js';
import { installAutoTranslate } from './i18n/autoTranslate.js';
import './styles/tokens.css';
import './style.css';
import './legacy.css';

/*
 * 路由懒加载：每个页面拆成独立 chunk。
 * 首屏只加载壳层 + 首页，解读页（含查看器与图表逻辑）按需下载。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/interpret', name: 'interpret', component: () => import('./views/InterpretView.vue') },
    { path: '/records', name: 'records', component: () => import('./views/RecordsView.vue') },
    { path: '/knowledge', name: 'knowledge', component: () => import('./views/KnowledgeView.vue') },
    { path: '/academy', name: 'academy', component: () => import('./views/AcademyView.vue') },
    { path: '/about', name: 'about', component: () => import('./views/AboutView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/home' }
  ],
  // 新页面从顶部开始，避免沿用上一页的滚动位置
  scrollBehavior: () => ({ top: 0 })
});

const app = createApp(App);
app.use(createPinia());
app.use(i18n);
app.use(router);
router.isReady().then(() => {
  app.mount('#app');
  installAutoTranslate();
});
