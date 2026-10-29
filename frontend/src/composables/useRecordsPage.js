import { computed } from 'vue';
import { useAppContext } from './useAppContext.js';
export function useRecordsPage() {
 const context = useAppContext();
 return { ...context, records: context.modules.records, filteredRecords: computed(() => context.modules.records.filteredRecords()) };
}
