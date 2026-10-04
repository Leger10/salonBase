// /src/hooks/use-toast-notification.js
import { toast } from 'sonner';

export function useToastNotification() {
  const showSuccess = (message, description) => {
    toast.success(message, { description });
  };

  const showError = (message, description) => {
    toast.error(message, { description });
  };

  const showInfo = (message, description) => {
    toast.info(message, { description });
  };

  const showWarning = (message, description) => {
    toast.warning(message, { description });
  };

  const showPromise = (promise, loading, success, error) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showPromise,
  };
}