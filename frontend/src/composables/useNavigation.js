import { computed, watch } from 'vue';
export function useNavigation({ AppState, router, scope }) {
  const pages = ['home','interpret','records','knowledge','academy','about'];
  let stop;
  function switchPage(name) {
    AppState.mobileMenuOpen = false;
    return router.push({ name: pages.includes(name) ? name : 'home' });
  }
  function mount() {
    if (stop) return;
    stop = watch(() => router.currentRoute.value.name, name => {
      AppState.currentPage = String(name || 'home');
      AppState.mobileMenuOpen = false;
      AppState.routeProgress.width = 65; AppState.routeProgress.opacity = 1;
      scope.schedule(() => {
        AppState.routeProgress.width = 100;
        scope.schedule(() => { AppState.routeProgress.opacity = 0; AppState.routeProgress.width = 0; }, 180);
      }, 120);
    }, { immediate: true });
  }
  function dispose() { stop?.(); stop = null; }
  const activePage = computed(() => String(router.currentRoute.value.name || 'home'));
  function navClass(page, mobile = false) {
    if (mobile) return 'mobile-nav-btn min-h-[40px] rounded-md px-3 py-2 text-left text-sm ' + (activePage.value === page ? 'font-semibold bg-primary/10 text-primary' : 'font-medium text-text-2 hover:bg-page-bg');
    return 'nav-btn cursor-pointer rounded-md px-3.5 py-2 text-sm transition-colors flex items-center gap-1.5 ' + (activePage.value === page ? 'font-semibold text-primary bg-primary/10' : 'font-medium text-text-2 hover:text-text-1 hover:bg-page-bg');
  }
  return { switchPage, activePage, navClass, mount, dispose };
}
