// /src/components/ui/button.jsx
import React from "react";

// ✅ Exporter les variantes pour les autres composants
export const buttonVariants = ({ variant = "default", size = "default", className = "" }) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  
  return `${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`;
};

export const Button = React.forwardRef(({ 
  className, 
  children, 
  variant = "default", 
  size = "default", 
  asChild = false,
  ...props 
}, ref) => {
  const Component = asChild ? 'span' : 'button';
  
  return (
    <Component
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${buttonVariants({ variant, size, className })}`}
      ref={ref}
      {...props}
    >
      {children}
    </Component>
  );
});

Button.displayName = "Button";