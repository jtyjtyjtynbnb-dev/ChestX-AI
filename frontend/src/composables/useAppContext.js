import { inject } from 'vue';
export const APP_CONTEXT = Symbol('chestx-app-context');
export function useAppContext() {
  const context = inject(APP_CONTEXT);
  if (!context) throw new Error('ChestX application coordinator is not mounted');
  return context;
}

