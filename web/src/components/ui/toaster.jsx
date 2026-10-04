// /src/components/ui/toaster.jsx
import { useTheme } from '@/hooks/use-theme';
import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toaster - Système de notifications toast
 * @example
 * // Dans App.jsx
 * <Toaster position="top-center" richColors />
 * 
 * // Dans un composant
 * import { toast } from "sonner";
 * toast.success("Succès !");
 * toast.error("Erreur");
 * toast.info("Information");
 * toast.warning("Avertissement");
 * toast.loading("Chargement...");
 * 
 * // Avec promesse
 * toast.promise(
 *   new Promise((resolve) => setTimeout(resolve, 2000)),
 *   {
 *     loading: "Envoi en cours...",
 *     success: "Envoyé avec succès !",
 *     error: "Erreur lors de l'envoi",
 *   }
 * );
 * 
 * // Avec action
 * toast("Message", {
 *   action: {
 *     label: "Annuler",
 *     onClick: () => console.log("Annulé"),
 *   },
 * });
 */
const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:bg-green-50 group-[.toast]:text-green-900 dark:group-[.toast]:bg-green-950 dark:group-[.toast]:text-green-50 group-[.toast]:border-green-200 dark:group-[.toast]:border-green-800",
          error: "group-[.toast]:bg-red-50 group-[.toast]:text-red-900 dark:group-[.toast]:bg-red-950 dark:group-[.toast]:text-red-50 group-[.toast]:border-red-200 dark:group-[.toast]:border-red-800",
          warning: "group-[.toast]:bg-yellow-50 group-[.toast]:text-yellow-900 dark:group-[.toast]:bg-yellow-950 dark:group-[.toast]:text-yellow-50 group-[.toast]:border-yellow-200 dark:group-[.toast]:border-yellow-800",
          info: "group-[.toast]:bg-blue-50 group-[.toast]:text-blue-900 dark:group-[.toast]:bg-blue-950 dark:group-[.toast]:text-blue-50 group-[.toast]:border-blue-200 dark:group-[.toast]:border-blue-800",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };