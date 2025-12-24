import { createContext } from 'react';

import { CacheContextType } from './types';

export const CacheContext = createContext<CacheContextType | undefined>(undefined);
