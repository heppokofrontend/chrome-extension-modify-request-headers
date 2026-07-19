import { HEADER_OPERATIONS, MATCH_TYPES } from '@/constants';
import type { HeaderRule, MatchType, OperationType } from '@/types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isOperationType = (value: unknown): value is OperationType =>
  typeof value === 'string' && (HEADER_OPERATIONS as readonly string[]).includes(value);

export const isMatchType = (value: unknown): value is MatchType =>
  typeof value === 'string' && (MATCH_TYPES as readonly string[]).includes(value);

export const isHeaderRule = (value: unknown): value is HeaderRule => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    isMatchType(value['matchType']) &&
    typeof value['url'] === 'string' &&
    typeof value['origin'] === 'string' &&
    typeof value['regexp'] === 'string' &&
    typeof value['headerName'] === 'string' &&
    isOperationType(value['operation']) &&
    typeof value['value'] === 'string' &&
    typeof value['isActive'] === 'boolean'
  );
};
