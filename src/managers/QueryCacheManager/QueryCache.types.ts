import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Configuration options for QueryCacheManager
 */
export interface CacheConfig<TData, TItem> {
  /**
   * React Query client instance
   */
  queryClient: QueryClient;

  /**
   * Query key that identifies the cached data
   */
  queryKey: QueryKey;

  /**
   * Function to extract the array of items from your response data
   * @example
   * // For simple array: data => data
   * // For nested: data => data.result.items
   * // For paginated: data => data.content
   */
  getItems: (data: TData) => TItem[];

  /**
   * Function to update the response data with new items array
   * @example
   * // For simple array: (data, items) => items
   * // For nested: (data, items) => ({ ...data, result: { ...data.result, items } })
   * // For paginated: (data, items) => ({ ...data, content: items })
   */
  setItems: (data: TData, items: TItem[]) => TData;

  /**
   * Function to extract a unique identifier from items
   * @default (item) => item.id
   */
  keyExtractor?: (item: TItem) => string | number;

  /**
   * Optional: Update metadata after adding items (e.g., totalCount)
   * @example (data, itemsLength) => ({ ...data, totalCount: data.totalCount + itemsLength })
   */
  onItemsAdd?: (data: TData, addedCount: number) => TData;

  /**
   * Optional: Update metadata after removing items (e.g., totalCount)
   * @example (data, itemsLength) => ({ ...data, totalCount: data.totalCount - itemsLength })
   */
  onItemsRemove?: (data: TData, removedCount: number) => TData;
}

/**
 * Callback handlers for cache operations
 */
export interface CacheHandlers<TItem> {
  onAdd: (newItem: TItem, position?: 'start' | 'end') => void;
  onUpdate: (updatedItem: Partial<TItem>, matcher?: (item: TItem) => boolean) => void;
  onDelete: (
    itemOrId: TItem | string | number,
    matcher?: (item: TItem) => boolean,
  ) => void;
}

/**
 * Position where a new item should be added
 */
export type InsertPosition = 'start' | 'end';
