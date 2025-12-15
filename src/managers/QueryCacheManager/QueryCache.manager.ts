import type { CacheConfig, CacheHandlers, InsertPosition } from './QueryCache.types';

/**
 * QueryCacheManager - Flexible cache manager for React Query
 *
 * Works with any response structure through user-defined getters/setters.
 *
 * @template TData - Your full response data type
 * @template TItem - Individual item type
 *
 * @example
 * ```typescript
 * // Simple array
 * const cache = new QueryCacheManager({
 *   queryClient,
 *   queryKey: ['todos'],
 *   getItems: (data) => data,
 *   setItems: (data, items) => items,
 * });
 *
 * // Paginated
 * const cache = new QueryCacheManager({
 *   queryClient,
 *   queryKey: ['users'],
 *   getItems: (data) => data.content,
 *   setItems: (data, items) => ({ ...data, content: items }),
 *   onItemsAdd: (data, count) => ({
 *     ...data,
 *     page: { ...data.page, totalElements: data.page.totalElements + count }
 *   }),
 * });
 * ```
 */
export class QueryCacheManager<TData, TItem> {
  private config: Required<
    Pick<CacheConfig<TData, TItem>, 'queryClient' | 'queryKey' | 'getItems' | 'setItems'>
  > &
    Pick<CacheConfig<TData, TItem>, 'keyExtractor' | 'onItemsAdd' | 'onItemsRemove'>;

  constructor(config: CacheConfig<TData, TItem>) {
    this.config = {
      ...config,
      keyExtractor: config.keyExtractor || ((item: any) => item.id),
    };
  }

  /**
   * Add item to cache
   */
  add(newItem: TItem, position: InsertPosition = 'start'): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        if (!oldData) return oldData;

        const items = this.config.getItems(oldData);
        if (!Array.isArray(items)) return oldData;

        const updatedItems =
          position === 'start' ? [newItem, ...items] : [...items, newItem];

        let result = this.config.setItems(oldData, updatedItems);

        if (this.config.onItemsAdd) {
          result = this.config.onItemsAdd(result, 1);
        }

        return result;
      });
    } catch (error) {
      console.error('[QueryCacheManager] Create failed:', error);
      this.invalidate();
    }
  }

  /**
   * Update existing item
   */
  update(updatedItem: Partial<TItem>, matcher?: (item: TItem) => boolean): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        if (!oldData) return oldData;

        const items = this.config.getItems(oldData);
        if (!Array.isArray(items)) return oldData;

        const matchFn =
          matcher ||
          ((item: TItem) =>
            this.config.keyExtractor!(item) ===
            this.config.keyExtractor!(updatedItem as TItem));

        const updatedItems = items.map((item) =>
          matchFn(item) ? { ...item, ...updatedItem } : item,
        );

        return this.config.setItems(oldData, updatedItems);
      });
    } catch (error) {
      console.error('[QueryCacheManager] Add failed:', error);
      this.invalidate();
    }
  }

  /**
   * Remove item from cache
   */
  delete(itemOrId: TItem | string | number, matcher?: (item: TItem) => boolean): void {
    try {
      this.config.queryClient.setQueryData<TData>(this.config.queryKey, (oldData) => {
        if (!oldData) return oldData;

        const items = this.config.getItems(oldData);
        if (!Array.isArray(items)) return oldData;

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

        let result = this.config.setItems(oldData, updatedItems);

        if (this.config.onItemsRemove && removedCount > 0) {
          result = this.config.onItemsRemove(result, removedCount);
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
   * Invalidate to refetch
   */
  invalidate(): void {
    this.config.queryClient.invalidateQueries({ queryKey: this.config.queryKey });
  }

  /**
   * Get handlers for mutations
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
