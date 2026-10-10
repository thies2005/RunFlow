import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'border-transparent bg-accent-blue text-white hover:bg-accent-blue/90',
    secondary: 'border-transparent bg-background-tertiary text-foreground hover:bg-surface-hover',
    destructive: 'border-transparent bg-negative text-white hover:bg-negative/90',
    outline: 'text-foreground border-line-strong',
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )} 
      {...props} 
    />
  )
}

export { Badge }
