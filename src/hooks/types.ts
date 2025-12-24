import type { UseMutationOptions } from '@tanstack/react-query';

import { type CacheConfig } from '../managers';

export type MutationTypes = 'add' | 'invalidate' | 'remove' | 'update';

export interface CacheActions<TData, TItem = unknown> extends Omit<
  CacheConfig<TData, TItem>,
  'queryClient'
> {
  type: MutationTypes;
}

export type CustomMutationOptions<TData, TError, TVariables> = UseMutationOptions<
  TData,
  TError,
  TVariables
> & {
  notify?: boolean;
  notifyError?: boolean;
  errorMessage?: string;
  notifySuccess?: boolean;
  successMessage?: string;
  cacheActions?: CacheActions<TData>[] | CacheActions<TData>;
  notificationConfig?: NotificationOptions;
};

export interface NotificationOptions {
  duration?: number;
  [key: string]: any;
}
