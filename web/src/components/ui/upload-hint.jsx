import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatsFor, formatBytes, maxBytesFor } from "@/utils/uploadLimits";

/**
 * Petite legende placee SOUS un champ de fichier : rappelle systematiquement
 * a l'utilisateur les formats acceptes et la taille maximale.
 *
 *   <input type="file" ... />
 *   <UploadHint kind="video" />
 */
export default function UploadHint({ kind = "image", className, icon: Icon = Info }) {
  const resolved = kind === "video" ? "video" : "image";
  const formats = formatsFor(resolved).join(", ");
  const max = formatBytes(maxBytesFor(resolved));

  return (
    <p
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span>
        {resolved === "video" ? "Vidéo" : "Image"} : {formats} —{" "}
        <span className="font-medium text-foreground/70">{max} maximum</span>
      </span>
    </p>
  );
}
