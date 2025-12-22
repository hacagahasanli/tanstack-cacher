import { getAtPath, setAtPath, incrementAtPath } from './QueryCache.utils';

import type { CacheConfig, CacheHandlers, InsertPosition } from './QueryCache.types';

/**
 * QueryCacheManager - Robust cache manager for React Query with path-based configuration
 *
 * Works with ANY response structure through path-based access.
 * Automatically handles missing data, nested structures, and pagination metadata.
 *
 * @template TData - Your full response data type
 * @template TItem - Individual item type
 *
 * @example
 * ```typescript
 * // Simple array at root
 * const cache = new QueryCacheManager({
 *   queryClient,
 *   queryKey: ['todos'],
 *   itemsPath: '', // Empty string means data IS the array
 * });
 *
 * // Nested array
 * const cache = new QueryCacheManager({
 *   queryClient,
 *   queryKey: ['users'],
 *   itemsPath: 'data.users',
 * });
 *
 * // Paginated response
 * const cache = new QueryCacheManager({
 *   queryClient,
 *   queryKey: ['users'],
 *   itemsPath: 'data.content',
 *   pagination: {
 *     totalElementsPath: 'data.page.totalElements',
 *     totalPagesPath: 'data.page.totalPages',
 *     currentPagePath: 'data.page.number',
 *   },
 * });
 *
 * // Different structure
 * const cache = new QueryCacheManager({
 *   queryClient,
 *   queryKey: ['posts'],
 *   itemsPath: 'items',
 *   pagination: {
 *     totalElementsPath: 'meta.total',
 *   },
 * });
 * ```
 */

export class QueryCacheManager<TData, TItem> {
  private config: Required<
    Pick<CacheConfig<TData, TItem>, 'queryClient' | 'queryKey' | 'itemsPath'>
  > &
    Pick<CacheConfig<TData, TItem>, 'keyExtractor' | 'pagination' | 'initialData'>;

  constructor(config: CacheConfig<TData, TItem>) {
    this.config = {
      ...config,
      keyExtractor: config.keyExtractor || ((item: any) => item.id),
    };
  }

  /**
   * Get items array from data
   * Returns empty array if path doesn't exist or data is null
   */
  private getItems(data: TData | null | undefined): TItem[] {
    if (!data) return [];

    if (!this.config.itemsPath) {
      return Array.isArray(data) ? (data as any) : [];
    }

    const items = getAtPath<TItem[]>(data, this.config.itemsPath, []);
    return Array.isArray(items) ? items : [];
  }

  /**
   * Set items array in data
   * Creates nested structure if it doesn't exist
   */
  private setItems(data: TData | null | undefined, items: TItem[]): TData {
    if (!data) {
      if (this.config.initialData) {
        data = this.config.initialData;
      } else {
        if (!this.config.itemsPath) {
          return items as any;
        }
        data = {} as TData;
      }
    }

    if (!this.config.itemsPath) {
      return items as any;
    }

    return setAtPath<TData>(data, this.config.itemsPath, items);
  }

  /**
   * Update pagination metadata after adding items
   */
  private updatePaginationOnAdd(data: TData, addedCount: number): TData {
    if (!this.config.pagination) return data;

    let result = data;

    if (this.config.pagination.totalElementsPath) {
      result = incrementAtPath<TData>(
        result,
        this.config.pagination.totalElementsPath,
        addedCount,
      );
    }

    if (
      this.config.pagination.totalPagesPath &&
      this.config.pagination.pageSizePath &&
      this.config.pagination.totalElementsPath
    ) {
      const pageSize = getAtPath<number>(result, this.config.pagination.pageSizePath, 0);
      const totalElements = getAtPath<number>(
        result,
        this.config.pagination.totalElementsPath,
        0,
      );

      if (pageSize > 0) {
        const totalPages = Math.ceil(totalElements / pageSize);
        result = setAtPath<TData>(
          result,
          this.config.pagination.totalPagesPath,
          totalPages,
        );
      }
    }

    return result;
  }

  /**
   * Update pagination metadata after removing items
   */
  private updatePaginationOnRemove(data: TData, removedCount: number): TData {
    if (!this.config.pagination) return data;

    let result = data;

    if (this.config.pagination.totalElementsPath) {
      result = incrementAtPath<TData>(
        result,
        this.config.pagination.totalElementsPath,
        -removedCount,
      );
    }

    // Recalculate total pages if both totalPagesPath and pageSizePath are provided
    if (
      this.config.pagination.totalPagesPath &&
      this.config.pagination.pageSizePath &&
      this.config.pagination.totalElementsPath
    ) {
      const pageSize = getAtPath<number>(result, this.config.pagination.pageSizePath, 0);
      const totalElements = getAtPath<number>(
        result,
        this.config.pagination.totalElementsPath,
        0,
      );

      if (pageSize > 0) {
        const totalPages = Math.ceil(Math.max(0, totalElements) / pageSize);
        result = setAtPath<TData>(
          result,
          this.config.pagination.totalPagesPath,
          totalPages,
        );
      }
    }

    return result;
  }

  /**
   * Add item to cache
   *
   * @param newItem - The item to add
   * @param position - Where to add: 'start' or 'end'
   */
  add(newItem: TItem, position: InsertPosition = 'start'): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        const items = this.getItems(oldData);

        const updatedItems =
          position === 'start' ? [newItem, ...items] : [...items, newItem];

        let result = this.setItems(oldData, updatedItems);
        result = this.updatePaginationOnAdd(result, 1);

        return result;
      });
    } catch (error) {
      console.error('[QueryCacheManager] Add failed:', error);
      this.invalidate();
    }
  }

  /**
   * Update existing item
   *
   * @param updatedItem - Partial item data to update
   * @param matcher - Optional custom matcher function. Defaults to matching by key
   */
  update(updatedItem: Partial<TItem>, matcher?: (item: TItem) => boolean): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        const items = this.getItems(oldData);

        const matchFn =
          matcher ||
          ((item: TItem) =>
            this.config.keyExtractor!(item) ===
            this.config.keyExtractor!(updatedItem as TItem));

        const updatedItems = items.map((item) =>
          matchFn(item) ? { ...item, ...updatedItem } : item,
        );

        return this.setItems(oldData, updatedItems);
      });
    } catch (error) {
      console.error('[QueryCacheManager] Update failed:', error);
      this.invalidate();
    }
  }

  /**
   * Remove item from cache
   *
   * @param itemOrId - Item object or ID to remove
   * @param matcher - Optional custom matcher function. Defaults to matching by key
   */
  delete(itemOrId: TItem | string | number, matcher?: (item: TItem) => boolean): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        const items = this.getItems(oldData);

        const matchFn =
          matcher ||
          ((item: TItem) => {
            if (typeof itemOrId === 'object') {
              return (
                this.config.keyExtractor!(item) ===
                this.config.keyExtractor!(itemOrId as TItem)
              );
            }
            return this.config.keyExtractor!(item) === itemOrId;
          });

        const originalLength = items.length;
        const updatedItems = items.filter((item) => !matchFn(item));
        const removedCount = originalLength - updatedItems.length;

        let result = this.setItems(oldData, updatedItems);

        if (removedCount > 0) {
          result = this.updatePaginationOnRemove(result, removedCount);
        }

        return result;
      });
    } catch (error) {
      console.error('[QueryCacheManager] Delete failed:', error);
      this.invalidate();
    }
  }

  /**
   * Replace full data
   *
   * @param newData - Complete new data to replace cache
   */
  replace(newData: TData): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, newData);
    } catch (error) {
      console.error('[QueryCacheManager] Replace failed:', error);
      this.invalidate();
    }
  }

  /**
   * Clear all items (keeps structure, empties array)
   */
  clear(): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        let result = this.setItems(oldData, []);

        // Reset pagination to 0
        if (this.config.pagination?.totalElementsPath) {
          result = setAtPath<TData>(result, this.config.pagination.totalElementsPath, 0);
        }
        if (this.config.pagination?.totalPagesPath) {
          result = setAtPath<TData>(result, this.config.pagination.totalPagesPath, 0);
        }

        return result;
      });
    } catch (error) {
      console.error('[QueryCacheManager] Clear failed:', error);
      this.invalidate();
    }
  }

  /**
   * Get current items from cache
   *
   * @returns Current items array or empty array if no data
   */
  getItemsFromCache(): TItem[] {
    const data = this.config.queryClient.getQueryData<TData>(this.config.queryKey);
    return this.getItems(data);
  }

  /**
   * Get full data from cache
   *
   * @returns Current full data or undefined if no data
   */
  getDataFromCache(): TData | undefined {
    return this.config.queryClient.getQueryData<TData>(this.config.queryKey);
  }

  /**
   * Invalidate query to trigger refetch
   */
  invalidate(): void {
    this.config.queryClient.invalidateQueries({ queryKey: this.config.queryKey });
  }

  /**
   * Refetch query immediately
   */
  refetch(key?: string | string[]): void {
    try {
      const queryKey = key ? (Array.isArray(key) ? key : [key]) : this.config.queryKey;
      this.config.queryClient.refetchQueries({
        queryKey,
        exact: true,
      });
    } catch (error) {
      console.error('[QueryCacheManager] Refetch failed:', error);
    }
  }

  /**
   *  Multiple refetch, refetch many endpoints at the same time
   * Usage: cache.refetch(['prisoners', 'visitors]);
   * */
  refetchMultiple(keys: Array<string | string[]>): void {
    keys.forEach((key) => this.refetch(key));
  }

  /**
   * Get handlers for use with mutations
   *
   * @returns Object with onAdd, onUpdate, onDelete handlers
   */
  createHandlers(): CacheHandlers<TItem> {
    return {
      onAdd: (newItem: TItem, position?: InsertPosition) => this.add(newItem, position),
      onUpdate: (updatedItem: Partial<TItem>, matcher?: (item: TItem) => boolean) =>
        this.update(updatedItem, matcher),
      onDelete: (itemOrId: TItem | string | number, matcher?: (item: TItem) => boolean) =>
        this.delete(itemOrId, matcher),
    };
  }
}
