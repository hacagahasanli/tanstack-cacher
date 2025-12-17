import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { UseQueryResult } from '@tanstack/react-query';

import { QueryCacheManager } from '../managers';
import { getOrCreateCacheManager } from '../utils/cacheRegistry';

import { type CustomQueryOptions } from './types';

export function useCustomQuery<
  TData,
  TError = unknown,
  // eslint-disable-next-line
  TItem = any,
>(
  options: CustomQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> & {
  cache?: QueryCacheManager<TData, TItem>;
} {
  const queryClient = useQueryClient();

  const { queryKey, cacheType, cacheConfig, ...rest } = options;

  const queryResult = useQuery<TData, TError>({
    queryKey,
    ...rest,
  });

  let cache: QueryCacheManager<TData, TItem> | undefined;

  if (cacheType) {
    cache = getOrCreateCacheManager<TData, TItem>(queryKey, queryClient, {
      cacheType,
      cacheConfig,
    });
  }

  return {
    ...queryResult,
    cache,
  };
}
