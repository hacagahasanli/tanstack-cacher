import { NotificationOptions } from '../hooks/types';

export interface NotificationContextType {
  showError: (message: string, options?: NotificationOptions) => void;
  showSuccess: (message: string, options?: NotificationOptions) => void;
}
