import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Spinner - Indicateur de chargement
 * @example
 * <Spinner />
 * <Spinner className="size-6 text-primary" />
 * <Spinner className="size-8 text-blue-500 animate-spin-slow" />
 */
function Spinner({ className, ...props }) {
  return (
    <Loader2
      role="status"
      aria-label="Chargement en cours..."
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };