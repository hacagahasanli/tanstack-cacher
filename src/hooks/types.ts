import type {
  QueryClient,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';

import { type CacheConfig } from '../managers';
import type { MutationTypes, ProgressHandler } from '../types/mutation';
import type { NotificationOptions } from '../types/notification';

export interface CacheActions<TData, TItem = unknown, TVariables = any> extends Omit<
  CacheConfig<TData, TItem>,
  'queryClient'
> {
  type: MutationTypes;
  /**
   * Picks the item that will be added/updated/removed in the cache.
   * Defaults to the mutation response (`data`).
   *
   * @example
   * // DELETE endpoints usually return nothing — use the id from variables
   * getItem: (_data, id) => id
   */
  getItem?: (data: TData, variables: TVariables) => unknown;
}

type BaseMutationOptions<TData, TError, TVariables, TOnMutateResult> = UseMutationOptions<
  TData,
  TError,
  TVariables,
  TOnMutateResult
>;

type NativeMutationFnContext<TData, TError, TVariables, TOnMutateResult> = Parameters<
  NonNullable<
    BaseMutationOptions<TData, TError, TVariables, TOnMutateResult>['mutationFn']
  >
>[1];

export type CacherMutationFnContext<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TOnMutateResult = unknown,
> = (NativeMutationFnContext<TData, TError, TVariables, TOnMutateResult> extends undefined
  ? unknown
  : NonNullable<NativeMutationFnContext<TData, TError, TVariables, TOnMutateResult>>) & {
  /** Optional — call it only when you need progress (e.g. pass to axios `onUploadProgress`). */
  onProgress?: ProgressHandler;
};

/**
 * Options of `useCacherMutation`. Also used by consumers as a plain `useMutation` options type
 * (`options?: CustomMutationOptions<TData, TError, TVariables>`), so it must stay assignable to
 * `UseMutationOptions` — that's why `onProgress` in the `mutationFn` context is optional.
 */
export type CustomMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
> = Omit<
  BaseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  'mutationFn'
> & {
  mutationFn?: (
    variables: TVariables,
    context: CacherMutationFnContext<TData, TError, TVariables, TOnMutateResult>,
  ) => Promise<TData>;
  /** Track progress reported via `onProgress` and return it as `progress` (0–100). */
  isWithProgressTrack?: boolean;
  isNotify?: boolean;
  isNotifyError?: boolean;
  errorMessage?: string;
  isNotifySuccess?: boolean;
  successMessage?: string;
  cacheActions?:
    | CacheActions<TData, unknown, TVariables>[]
    | CacheActions<TData, unknown, TVariables>;
  notificationConfig?: NotificationOptions;
};

/** Result of `useCacherMutation({ isWithProgressTrack: true, ... })`. */
export type CacherMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
> = UseMutationResult<TData, TError, TVariables, TOnMutateResult> & {
  /** Progress of the latest mutation call, 0–100. */
  progress: number;
};

/** Signature of `useCacherMutation`: `progress` is returned only with `isWithProgressTrack: true`. */
export interface CacherMutationHook {
  <TData = unknown, TError = Error, TVariables = void, TOnMutateResult = unknown>(
    options: CustomMutationOptions<TData, TError, TVariables, TOnMutateResult> & {
      isWithProgressTrack: true;
    },
    queryClient?: QueryClient,
  ): CacherMutationResult<TData, TError, TVariables, TOnMutateResult>;

  <TData = unknown, TError = Error, TVariables = void, TOnMutateResult = unknown>(
    options: CustomMutationOptions<TData, TError, TVariables, TOnMutateResult>,
    queryClient?: QueryClient,
  ): UseMutationResult<TData, TError, TVariables, TOnMutateResult>;
}
