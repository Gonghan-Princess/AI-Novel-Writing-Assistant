import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-lg border border-input/75 bg-background/72 px-3 py-2 text-sm shadow-inner shadow-foreground/[0.025] ring-offset-background transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/78 hover:border-primary/30 hover:bg-background/88 focus-visible:border-primary/45 focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
