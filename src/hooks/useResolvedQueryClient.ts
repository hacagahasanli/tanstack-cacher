import { useContext } from 'react';
import { QueryClientContext, type QueryClient } from '@tanstack/react-query';

import { cacheManagerFactory } from '../managers';

/**
 * Resolves a QueryClient without throwing TanStack's "No QueryClient set" error.
 *
 * Priority: explicit argument → nearest QueryClientProvider → client registered by <CacheProvider />.
 */
export const useResolvedQueryClient = (queryClient?: QueryClient): QueryClient => {
  const contextClient = useContext(QueryClientContext);

  const resolved = queryClient ?? contextClient ?? cacheManagerFactory.getQueryClient();

  if (!resolved) {
    throw new Error(
      '[tanstack-cacher] No QueryClient found. Wrap your app with ' +
        '<CacheProvider queryClient={queryClient}> (or <QueryClientProvider client={queryClient}>), ' +
        'or pass the client as the second argument of the hook.',
    );
  }

  return resolved;
};
