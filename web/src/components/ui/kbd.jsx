import { cn } from "@/lib/utils";

/**
 * Kbd - Raccourci clavier
 * @example
 * <Kbd>Ctrl</Kbd> + <Kbd>C</Kbd>
 * <Kbd>⌘</Kbd> + <Kbd>⇧</Kbd> + <Kbd>P</Kbd>
 */
function Kbd({ className, ...props }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    />
  );
}

/**
 * KbdGroup - Groupe de raccourcis clavier
 * @example
 * <KbdGroup>
 *   <Kbd>Ctrl</Kbd>
 *   <Kbd>+</Kbd>
 *   <Kbd>C</Kbd>
 * </KbdGroup>
 */
function KbdGroup({ className, ...props }) {
  return (
    <span
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };