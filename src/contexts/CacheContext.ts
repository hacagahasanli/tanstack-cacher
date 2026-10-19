import { createContext } from 'react';

import type { CacheContextType } from '../types/context';

export const CacheContext = createContext<CacheContextType | undefined>(undefined);
