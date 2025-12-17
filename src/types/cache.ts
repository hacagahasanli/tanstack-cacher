import type { CacheConfig } from '../managers';

export type CacheOptions<TData = any, TItem = any> = Omit<
  CacheConfig<TData, TItem>,
  'queryClient' | 'queryKey'
>;
