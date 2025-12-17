import type { QueryKey } from '@tanstack/react-query';

import { QueryCacheManager } from '../managers';
import type { CacheOptions } from '../types/cache';

const cacheConfigRegistry = new Map<string, CacheOptions>();
const cacheRegistry = new Map<string, QueryCacheManager<any, any>>();

const defaultConfigs: Record<string, CacheOptions> = {
  paginated: {
    itemsPath: 'data.content',
    pagination: {
      totalElementsPath: 'data.page.totalElements',
      totalPagesPath: 'data.page.totalPages',
      currentPagePath: 'data.page.number',
      pageSizePath: 'data.page.size',
    },
  },
  nonPaginated: {
    itemsPath: 'data',
  },
};

Object.entries(defaultConfigs).forEach(([key, config]) => {
  cacheConfigRegistry.set(key, config);
});

export const getOrCreateCacheManager = <TData = any, TItem = any>(
  queryKey: QueryKey,
  queryClient: any,
  options?: {
    cacheType?: string;
    cacheConfig?: CacheOptions;
  },
): QueryCacheManager<TData, TItem> => {
  const key = JSON.stringify(queryKey);

  if (cacheRegistry.has(key)) {
    return cacheRegistry.get(key) as QueryCacheManager<TData, TItem>;
  }

  const cacheType = options?.cacheType;
  const config =
    options?.cacheConfig || (cacheType && cacheConfigRegistry.get(cacheType));

  if (!config) {
    throw new Error(
      `[CacheManager] Unknown cacheType "${cacheType}". Available: ${[
        ...cacheConfigRegistry.keys(),
      ].join(', ')}`,
    );
  }

  const manager = new QueryCacheManager<TData, TItem>({
    queryClient,
    queryKey,
    ...config,
  });

  cacheRegistry.set(key, manager);
  return manager;
};

export const resetCacheManager = (queryKey: QueryKey): void => {
  cacheRegistry.delete(JSON.stringify(queryKey));
};

export const resetAllCacheManagers = (): void => {
  cacheRegistry.clear();
};

export const registerCacheConfig = (name: string, config: CacheOptions): void => {
  cacheConfigRegistry.set(name, config);
};

export const registerCacheConfigs = (configs: Record<string, CacheOptions>): void => {
  Object.entries(configs).forEach(([key, config]) => {
    cacheConfigRegistry.set(key, config);
  });
};
