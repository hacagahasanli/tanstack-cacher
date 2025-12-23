/**
 * Path-based utilities for accessing and modifying nested objects
 */

import { type MutationTypes } from '../../hooks/types';
import { type QueryCacheManager } from './QueryCache.manager';

/**
 * Get value at path in object
 * Supports dot notation: "data.items", "page.totalElements"
 *
 * @param obj - The object to get value from
 * @param path - Dot-separated path
 * @param defaultValue - Default value if path doesn't exist
 * @returns Value at path or defaultValue
 */
export function getAtPath<T = any>(obj: any, path: string, defaultValue?: T): T {
  if (!obj || !path) return defaultValue as T;

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null) {
      return defaultValue as T;
    }
    result = result[key];
  }

  return result !== undefined ? result : (defaultValue as T);
}

/**
 * Set value at path in object (immutably)
 * Creates nested objects if they don't exist
 *
 * @param obj - The object to update
 * @param path - Dot-separated path
 * @param value - Value to set
 * @returns New object with updated value
 */
export function setAtPath<T = any>(obj: any, path: string, value: any): T {
  if (!path) return obj;

  const keys = path.split('.');

  const root = obj ? { ...obj } : {};
  let current: any = root;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }

    current = current[key];
  }

  current[keys[keys.length - 1]] = value;

  return root as T;
}

/**
 * Increment numeric value at path
 * Creates path with value 0 if it doesn't exist
 *
 * @param obj - The object to update
 * @param path - Dot-separated path
 * @param increment - Amount to add (can be negative)
 * @returns New object with incremented value
 */
export function incrementAtPath<T = any>(obj: any, path: string, increment: number): T {
  const currentValue = getAtPath<number>(obj, path, 0);
  const newValue = currentValue + increment;
  return setAtPath<T>(obj, path, newValue);
}

/**
 * Check if path exists in object
 *
 * @param obj - The object to check
 * @param path - Dot-separated path
 * @returns true if path exists
 */
export function hasPath(obj: any, path: string): boolean {
  if (!obj || !path) return false;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return false;
    }
    current = current[key];
  }

  return true;
}

export const runCacheManagers = <TData>(
  type: MutationTypes,
  manager: QueryCacheManager<unknown, unknown>,
  data: Partial<TData>,
) => {
  switch (type) {
    case 'invalidate':
      manager.invalidate();
      break;
    case 'remove':
      manager.delete(data);
      break;
    case 'add':
      manager.add(data);
      break;
    case 'update':
      manager.update(data);
      break;
    default:
      break;
  }
};
