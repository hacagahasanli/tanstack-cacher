import { QueryClient } from '@tanstack/react-query';
import { QueryCacheManager } from './QueryCache.manager';
import type { CacheConfig } from './QueryCache.types';

/**
 * Type for QueryCacheManager constructor
 */
export type CacheManagerConstructor = new <TData, TItem>(
  config: CacheConfig<TData, TItem>,
) => QueryCacheManager<TData, TItem>;

/**
 * Factory for creating cache manager instances
 * Allows users to configure a custom manager class that extends QueryCacheManager
 */
class CacheManagerFactory {
  private queryClient: QueryClient | undefined = undefined;
  private managerClass: CacheManagerConstructor = QueryCacheManager;

  setManagerClass(managerClass: CacheManagerConstructor): void {
    this.managerClass = managerClass;
  }

  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
  }

  getQueryClient(): QueryClient | undefined {
    return this.queryClient;
  }

  resetManagerClass(): void {
    this.managerClass = QueryCacheManager;
  }

  create<TData, TItem>(
    config: CacheConfig<TData, TItem>,
  ): QueryCacheManager<TData, TItem> {
    return new this.managerClass<TData, TItem>({
      ...config,
      queryClient: this.queryClient,
    });
  }

  getManagerClass(): CacheManagerConstructor {
    return this.managerClass;
  }
}

export const cacheManagerFactory = new CacheManagerFactory();
