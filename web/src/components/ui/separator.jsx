import React from "react";

export const Separator = ({ className, orientation = "horizontal", ...props }) => (
  <div
    className={`shrink-0 ${orientation === "horizontal" ? "h-px w-full" : "h-full w-px"} bg-border ${className || ''}`}
    {...props}
  />
);