import type { ProgressInput } from '../hooks/types';

export const toPercent = (progress: ProgressInput): number => {
  const value =
    typeof progress === 'number'
      ? progress
      : progress.total
        ? (progress.loaded / progress.total) * 100
        : 0;

  return Math.min(100, Math.max(0, Math.round(value)));
};
