import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cacheManagerFactory } from '../managers';
import { runCacheManagers } from '../managers/QueryCacheManager/QueryCache.utils';

import { useCacherContext } from './useCacherContext';

import type { CustomMutationOptions, NotificationType } from './types';

const getApiErrorMessage = (apiError: unknown): string | undefined => {
  if (typeof apiError !== 'object' || apiError === null || !('error' in apiError)) {
    return undefined;
  }

  const { error } = apiError;

  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return undefined;
  }

  return typeof error.message === 'string' ? error.message : undefined;
};

export const useCacherMutation = <TData, TError, TVariables = void, TContext = unknown>(
  options: CustomMutationOptions<TData, TError, TVariables, TContext>,
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

  const queryClient = useQueryClient();

  const shouldNotifyError = notify || notifyError;
  const shouldNotifySuccess = notify || notifySuccess;

  const cacheActionsToRun = Array.isArray(cacheActions)
    ? cacheActions
    : cacheActions
      ? [cacheActions]
      : [];

  const showNotification = (type: NotificationType, message: string) => {
    if (cacherContext?.notify) {
      cacherContext.notify(message, { ...notificationConfig, type });
      return;
    }

    const legacyNotify = type === 'success' ? cacherContext?.showSuccess : cacherContext?.showError;
    legacyNotify?.(message, notificationConfig);
  };

  const runCacheActions = (data: TData) => {
    cacheActionsToRun.forEach((action) => {
      const { type, ...config } = action;
      const manager = cacheManagerFactory.create({ ...config, queryClient });
      runCacheManagers<TData>(type, manager, data);
    });
  };

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,

    onSuccess: (...args) => {
      const [data] = args;

      if (shouldNotifySuccess) {
        showNotification('success', successMessage);
      }

      onSuccess?.(...args);
      runCacheActions(data);
    },

    onError: (...args) => {
      const [apiError] = args;

      const message =
        cacherContext?.getErrorMessage?.(apiError) ?? getApiErrorMessage(apiError) ?? errorMessage;

      if (shouldNotifyError) {
        showNotification('error', message);
      }

      onError?.(...args);
    },
  });
};
