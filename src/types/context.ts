import type { NotificationOptions } from './notification';

export interface CacheContextType {
  showError?: (message: string, options?: NotificationOptions) => void;
  showSuccess?: (message: string, options?: NotificationOptions) => void;
  getErrorMessage?(error: unknown): string | undefined | void;
}
