import { useCallback, useMemo } from 'react';

import { useMutation } from '@tanstack/react-query';

import { cacheManagerFactory } from '../managers';
import { runCacheManagers } from '../managers/QueryCacheManager/QueryCache.utils';

import { useCacherContext } from './useCacherContext';

import type { CustomMutationOptions } from './types';

export const useCacherMutation = <TData, TError, TVariables = void>(
  options: CustomMutationOptions<TData, TError, TVariables>,
) => {
  const {
    onError,
    onSuccess,
    cacheActions,
    notify = false,
    notifyError = false,
    notifySuccess = false,
    successMessage = 'Əməliyyat uğurla tamamlandı!',
    errorMessage = 'Əməliyyat zamanı xəta baş verdi!',
    notificationConfig = { duration: 2 },
    ...rest
  } = options;

  const cacherContext = useCacherContext();

  const shouldNotifyError = notify || notifyError;
  const shouldNotifySuccess = notify || notifySuccess;

  const cacheActionsToRun = useMemo(() => {
    if (Array.isArray(cacheActions)) return cacheActions;
    if (cacheActions) return [cacheActions];
    return [];
  }, [cacheActions]);

  const runCacheActions = useCallback(
    (data: TData) => {
      cacheActionsToRun.forEach((action) => {
        const { type, ...config } = action;
        const manager = cacheManagerFactory.create(config);
        runCacheManagers<TData>(type, manager, data);
      });
    },
    [cacheActionsToRun],
  );

  return useMutation<TData, TError, TVariables>({
    ...rest,

    onSuccess: (data, variables, meta, context) => {
      if (shouldNotifySuccess) {
        cacherContext?.showSuccess?.(successMessage, notificationConfig);
      }

      onSuccess?.(data, variables, meta, context);
      runCacheActions(data);
    },

    onError: (apiError, variables, meta, context) => {
      const message =
        cacherContext?.getErrorMessage?.(apiError) ??
        (apiError as any)?.error?.message ??
        errorMessage;

      if (shouldNotifyError) {
        cacherContext?.showError?.(message, notificationConfig);
      }

      onError?.(apiError, variables, meta, context);
    },
  });
};
