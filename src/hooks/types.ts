import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

import type { CacheOptions } from '../types/cache';

export type CustomQueryOptions<TData, TError = unknown> = UseQueryOptions<
  TData,
  TError
> & {
  queryKey: QueryKey;
  cacheType?: string;
  queryFn: () => Promise<TData>;
  cacheConfig?: CacheOptions;
};

export type CustomMutationOptions<TData, TError, TVariables, TContext> =
  UseMutationOptions<TData, TError, TVariables, TContext> & {
    notify?: boolean;
    notifyError?: boolean;
    errorMessage?: string;
    notifySuccess?: boolean;
    successMessage?: string;
    notificationConfig?: NotificationOptions;
    getErrorMessage?: (error: TError) => string;
  };

export interface NotificationOptions {
  duration?: number;
  [key: string]: any;
}
