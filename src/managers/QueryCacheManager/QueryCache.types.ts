import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Pagination configuration for path-based access
 */
export interface PaginationConfig {
  /**
   * Path to total elements count
   * @example "page.totalElements" | "meta.total" | "totalCount"
   */
  totalElementsPath?: string;

  /**
   * Path to total pages count
   * @example "page.totalPages" | "meta.totalPages" | "pageCount"
   */
  totalPagesPath?: string;

  /**
   * Path to current page number
   * @example "page.number" | "meta.currentPage" | "page"
   */
  currentPagePath?: string;

  /**
   * Path to page size
   * @example "page.size" | "meta.pageSize" | "limit"
   */
  pageSizePath?: string;
}

/**
 * Configuration for QueryCacheManager with path-based access
 *
 * @template TData - Your full response data type
 * @template TItem - Individual item type in the array
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
   * Path to the items array in your response
   * Supports dot notation for nested paths
   *
   * @example
   * "items" // For { items: [...] }
   * "data.content" // For { data: { content: [...] } }
   * "result.users" // For { result: { users: [...] } }
   */
  itemsPath: string;

  /**
   * Optional: Pagination configuration
   * Provide this if your response includes pagination metadata
   *
   * @example
   * {
   *   totalElementsPath: "page.totalElements",
   *   totalPagesPath: "page.totalPages",
   *   currentPagePath: "page.number"
   * }
   */
  pagination?: PaginationConfig;

  /**
   * Function to extract a unique identifier from items
   * @default (item) => item.id
   */
  keyExtractor?: (item: TItem) => string | number;

  /**
   * Optional: Initial data structure when cache is empty
   * If not provided, will create minimal structure with empty array
   *
   * @example
   * { data: { content: [] }, page: { totalElements: 0, totalPages: 0 } }
   */
  initialData?: TData;
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
