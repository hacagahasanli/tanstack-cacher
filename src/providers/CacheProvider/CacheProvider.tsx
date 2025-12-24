import React, { ReactNode } from 'react';

import { CacheContext, CacheContextType } from '../../contexts';

interface CacheProviderProps {
  children: ReactNode;
  config: CacheContextType;
}

export const CacheProvider = ({ config, children }: CacheProviderProps) => {
  return <CacheContext.Provider value={config}>{children}</CacheContext.Provider>;
};
