import { useMutation } from '@tanstack/react-query';

import { cacheManagerFactory } from '../managers';
import { runCacheManagers } from '../managers/QueryCacheManager/QueryCache.utils';

import { useNotificationContext } from './useNotificationContext';

import type { CustomMutationOptions } from './types';

/**
 * useCustomMutation - A type-safe wrapper around React Query's `useMutation`.
 *
 * Provides optional notifications on success or error and ensures type-safe
 * callbacks for your mutations. Supports full generics for data, error, variables,
 * and context, making it highly extendable for any API response.
 *
 * @template TData - The type of data returned by the mutation
 * @template TError - The type of error returned by the mutation (usually your API error type)
 * @template TVariables - The type of variables passed to the mutation function
 * @template TContext - The type of context for optimistic updates
 *
 * @param {CustomMutationOptions<TData, TError, TVariables, TContext>} options - Mutation options including callbacks and notification config
 * @returns {UseMutationResult<TData, TError, TVariables, TContext>} React Query mutation object enhanced with notifications
 *
 * @example
 * ```typescript
 * const mutation = useCustomMutation<User, ApiError, { id: string }>({
 *   mutationFn: (variables) => api.updateUser(variables.id),
 *   notify: true,
 *   successMessage: 'User updated successfully!',
 *   onSuccess: (data, variables, context) => {
 *     console.log('Mutation succeeded', data);
 *   },
 *   onError: (error, variables, context) => {
 *     console.error('Mutation failed', error);
 *   },
 * });
 *
 * // Trigger mutation
 * mutation.mutate({ id: '123' });
 * ```
 */

export const useCustomMutation = <TData, TError, TVariables = void>(
  options: CustomMutationOptions<TData, TError, TVariables>,
) => {
  const {
    onError,
    onSuccess,
    cacheActions,
    notify = false,
    notifyError = false,
    notifySuccess = false,
    errorMessage = 'Operation failed!',
    successMessage = 'Operation successfull!',
    notificationConfig = { duration: 2 },
    getErrorMessage,
    ...rest
  } = options;

  const notificationContext = useNotificationContext();

  return useMutation<TData, TError, TVariables>({
    ...rest,
    onSuccess: (data, variables, mResult, context) => {
      if (notify || notifySuccess) {
        notificationContext?.showSuccess?.(successMessage, notificationConfig);
      }

      onSuccess?.(data, variables, mResult, context);

      if (Array.isArray(cacheActions)) {
        cacheActions.forEach((item) => {
          const { type, ...rest } = item;
          const manager = cacheManagerFactory.create(rest);
          runCacheManagers<TData>(type, manager, data);
        });
      } else if (cacheActions) {
        const { type, ...rest } = cacheActions;
        const manager = cacheManagerFactory.create(rest);
        runCacheManagers<TData>(type, manager, data);
      }
    },
    onError: (apiError, variables, mResult, context) => {
      const message = getErrorMessage
        ? getErrorMessage(apiError)
        : ((apiError as any)?.error?.message ?? errorMessage);

      if (notify || notifyError) {
        notificationContext?.showError(message, notificationConfig);
      }

      onError?.(apiError, variables, mResult, context);
    },
  });
};
