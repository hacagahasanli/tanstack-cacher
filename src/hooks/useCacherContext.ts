import { useContext } from 'react';

import { CacheContext, type CacheContextType } from '../contexts';

export const useCacherContext = (): CacheContextType => {
  const context = useContext(CacheContext);

  if (!context) {
    console.warn(
      'useCacherContext was called outside of <NotificationProvider />. ' +
        'Wrap your app with <NotificationProvider /> to enable notifications.',
    );
  }

  return context as CacheContextType;
};
