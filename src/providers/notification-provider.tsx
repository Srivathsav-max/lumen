'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Notification types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

// Notification interface
export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

// Context interface
interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type: NotificationType, duration?: number) => void;
  dismissNotification: (id: string) => void;
}

// Create context with default values
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  showNotification: () => {},
  dismissNotification: () => {},
});

// Custom hook to use the notification context
export const useNotification = () => useContext(NotificationContext);

// Custom hook that provides toast functions
export const useToast = () => {
  const { showNotification } = useNotification();
  
  return {
    success: (message: string, duration?: number) => {
      showNotification(message, 'success', duration);
    },
    error: (message: string, duration?: number) => {
      showNotification(message, 'error', duration);
    },
    info: (message: string, duration?: number) => {
      showNotification(message, 'info', duration);
    },
    warning: (message: string, duration?: number) => {
      showNotification(message, 'warning', duration);
    }
  };
};

// Export a toast object for compatibility with existing code
// This is a placeholder that will be properly initialized in ToastProvider component
export const toast = {
  success: (message: string) => console.warn('Toast not initialized. Use useToast hook instead.'),
  error: (message: string) => console.warn('Toast not initialized. Use useToast hook instead.'),
  info: (message: string) => console.warn('Toast not initialized. Use useToast hook instead.'),
  warning: (message: string) => console.warn('Toast not initialized. Use useToast hook instead.')
};

// Notification provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Function to show a notification
  const showNotification = (
    message: string,
    type: NotificationType = 'info',
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification = { id, message, type, duration };
    
    setNotifications((prev) => [...prev, newNotification]);
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  };

  // Function to dismiss a notification
  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, showNotification, dismissNotification }}
    >
      {children}
      <Toaster />
    </NotificationContext.Provider>
  );
}

// Toaster component to display notifications
function Toaster() {
  const { notifications, dismissNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`bg-white rounded-lg shadow-[0_4px_0_0_#333] border-2 border-[#333] p-4 relative transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200 flex justify-between items-center ${getNotificationStyles(
            notification.type
          )}`}
          role="alert"
        >
          <div className="flex items-center">
            {getNotificationIcon(notification.type)}
            <p className="text-sm font-mono text-[#333] ml-3">{notification.message}</p>
          </div>
          <button
            onClick={() => dismissNotification(notification.id)}
            className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Close notification"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// Create a ToastProvider component that provides the toast functions globally
export function ToastProvider({ children }: { children: ReactNode }) {
  const { showNotification } = useNotification();
  
  // Override the global toast object with actual implementations
  // This is a side effect that happens once when the component mounts
  React.useEffect(() => {
    // @ts-ignore - We're intentionally modifying the module-level object
    toast.success = (message: string, duration?: number) => {
      showNotification(message, 'success', duration);
    };
    // @ts-ignore
    toast.error = (message: string, duration?: number) => {
      showNotification(message, 'error', duration);
    };
    // @ts-ignore
    toast.info = (message: string, duration?: number) => {
      showNotification(message, 'info', duration);
    };
    // @ts-ignore
    toast.warning = (message: string, duration?: number) => {
      showNotification(message, 'warning', duration);
    };
  }, [showNotification]);
  
  return <>{children}</>;
}

// Helper function to get notification styles based on type
function getNotificationStyles(type: NotificationType): string {
  switch (type) {
    case 'success':
      return 'border-green-500 bg-green-50';
    case 'error':
      return 'border-red-500 bg-red-50';
    case 'warning':
      return 'border-yellow-500 bg-yellow-50';
    case 'info':
    default:
      return 'border-purple-500 bg-purple-50';
  }
}

// Helper function to get notification icon based on type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'success':
      return (
        <div className="bg-green-100 p-2 rounded-full">
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="bg-red-100 p-2 rounded-full">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case 'warning':
      return (
        <div className="bg-yellow-100 p-2 rounded-full">
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    case 'info':
    default:
      return (
        <div className="bg-purple-100 p-2 rounded-full">
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}
