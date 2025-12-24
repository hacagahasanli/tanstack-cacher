import { NotificationOptions } from '../hooks/types';

export interface CacheContextType {
  showError: (message: string, options?: NotificationOptions) => void;
  showSuccess: (message: string, options?: NotificationOptions) => void;
  getErrorMessage: (error: any) => void;
}
