import { FILTER_STATUSES } from '@/contexts/popup/components/filter/constants';
import type { FilterStatus } from '@/contexts/popup/components/filter/types';

export const isFilterStatus = (value: string): value is FilterStatus =>
  (FILTER_STATUSES as readonly string[]).includes(value);
