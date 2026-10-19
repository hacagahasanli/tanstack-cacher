import { useResolvedQueryClient } from './useResolvedQueryClient';

import { CacheConfig, QueryCacheManager } from '../managers';

/**
 * Creates a map of {@link QueryCacheManager} instances from the given configuration.
 *
 * @template T
 * A record where each key corresponds to a {@link QueryCacheManager} instance.
 *
 * @param configs
 * An object describing cache managers to create.
 * - `queryKey` — React Query key used by the cache manager.
 * - `options` — Partial {@link CacheConfig} without `queryClient`
 *   (the query client is injected automatically by this hook).
 *
 * @returns
 * An object with the same keys as `configs`, where each value is an initialized
 * {@link QueryCacheManager}.
 */

export const useQueryCacheManagers = <
  T extends Record<string, QueryCacheManager<any, any>>,
>(configs: {
  [K in keyof T]: {
    queryKey: readonly unknown[];
    options?: Partial<Omit<CacheConfig<any, any>, 'queryClient'>>;
  };
}): T => {
  const queryClient = useResolvedQueryClient();

  const managers = {} as T;

  Object.entries(configs).forEach(([key, config]) => {
    const options = config.options ?? {};

    managers[key as keyof T] = new QueryCacheManager({
      queryKey: config.queryKey,
      queryClient,
      ...options,
      itemsPath: options.itemsPath ?? '',
    }) as T[keyof T];
  });

  return managers;
};
