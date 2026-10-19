import { useContext, useState } from 'react';
import {
  useMutation,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import { CacheContext } from '../contexts';
import { toPercent } from '../utils/progress';
import { cacheManagerFactory } from '../managers';
import { runCacheManagers } from '../managers/QueryCacheManager/QueryCache.utils';

import { useResolvedQueryClient } from './useResolvedQueryClient';

import type {
  ProgressInput,
  CacherMutationHook,
  CacherMutationResult,
  CustomMutationOptions,
  CacherMutationFnContext,
} from './types';

function useCacherMutationImpl<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TOnMutateResult = unknown,
>(
  options: CustomMutationOptions<TData, TError, TVariables, TOnMutateResult>,
  queryClientOverride?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TOnMutateResult> {
  const {
    onError,
    onSuccess,
    mutationFn,
    cacheActions,
    isNotify = false,
    isNotifyError = false,
    isNotifySuccess = false,
    isWithProgressTrack = false,
    notificationConfig = { duration: 1.5 },
    successMessage = 'Əməliyyat uğurla tamamlandı!',
    errorMessage = 'Əməliyyat zamanı xəta baş verdi!',
    ...rest
  } = options;

  const cacherContext = useContext(CacheContext);
  const queryClient = useResolvedQueryClient(queryClientOverride);

  const [progress, setProgress] = useState(0);

  const shouldNotifyError = isNotify || isNotifyError;
  const shouldNotifySuccess = isNotify || isNotifySuccess;

  const cacheActionsToRun = Array.isArray(cacheActions)
    ? cacheActions
    : cacheActions
      ? [cacheActions]
      : [];

  const runCacheActions = (data: TData, variables: TVariables) => {
    cacheActionsToRun.forEach(({ type, getItem, ...config }) => {
      const manager = cacheManagerFactory.create({ ...config, queryClient });
      const item = getItem ? getItem(data, variables) : data;
      runCacheManagers(type, manager, item);
    });
  };

  const mutation = useMutation<TData, TError, TVariables, TOnMutateResult>(
    {
      ...rest,

      ...(mutationFn && {
        mutationFn: (variables: TVariables, ...args: unknown[]) => {
          const context = args[0] as CacherMutationFnContext<
            TData,
            TError,
            TVariables,
            TOnMutateResult
          >;

          if (!isWithProgressTrack) return mutationFn(variables, context);

          setProgress(0);

          const onProgress = (value: ProgressInput) => setProgress(toPercent(value));

          return mutationFn(variables, { ...context, onProgress }).then((data) => {
            setProgress(100);
            return data;
          });
        },
      }),

      onSuccess: (...args) => {
        const [data, variables] = args;

        if (shouldNotifySuccess) {
          cacherContext?.showSuccess?.(successMessage, notificationConfig);
        }

        runCacheActions(data, variables);

        return onSuccess?.(...args);
      },

      onError: (...args) => {
        const [apiError] = args;

        const message =
          cacherContext?.getErrorMessage?.(apiError) ??
          (apiError as any)?.error?.message ??
          (apiError as any)?.message ??
          errorMessage;

        if (shouldNotifyError) {
          cacherContext?.showError?.(message, notificationConfig);
        }

        return onError?.(...args);
      },
    },
    queryClient,
  );

  if (!isWithProgressTrack) return mutation;

  const resetWithProgress = () => {
    setProgress(0);
    mutation.reset();
  };

  return {
    ...mutation,
    progress,
    reset: resetWithProgress,
  } as CacherMutationResult<TData, TError, TVariables, TOnMutateResult>;
}

export const useCacherMutation = useCacherMutationImpl as CacherMutationHook;
