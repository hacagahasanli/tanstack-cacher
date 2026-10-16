import type { NotificationOptions, NotificationType } from '../hooks/types';

export interface CacheContextType {
  notify?(message: string, options: NotificationOptions & { type: NotificationType }): void;
  getErrorMessage?(error: unknown): string | undefined;
  /** @deprecated Use `notify` instead */
  showError?(message: string, options?: NotificationOptions): void;
  /** @deprecated Use `notify` instead */
  showSuccess?(message: string, options?: NotificationOptions): void;
}
