import React, { ReactNode, useContext, useEffect } from 'react';
import {
  QueryClient,
  QueryClientContext,
  QueryClientProvider,
} from '@tanstack/react-query';

import { CacheContext, CacheContextType } from '../../contexts';
import { cacheManagerFactory } from '../../managers';

interface CacheProviderProps {
  children: ReactNode;
  /** Notification handlers used by `useCacherMutation` (`isNotify`, `isNotifySuccess`, `isNotifyError`). */
  config?: CacheContextType;
  /**
   * Optional QueryClient. When passed, CacheProvider also renders `<QueryClientProvider />`,
   * so a single provider is enough.
   */
  queryClient?: QueryClient;
}

export const CacheProvider = ({ config, queryClient, children }: CacheProviderProps) => {
  const contextClient = useContext(QueryClientContext);
  const client = queryClient ?? contextClient;

  useEffect(() => {
    if (client) cacheManagerFactory.setQueryClient(client);
  }, [client]);

  const content = (
    <CacheContext.Provider value={config}>{children}</CacheContext.Provider>
  );

  if (!queryClient) return content;

  return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
};
