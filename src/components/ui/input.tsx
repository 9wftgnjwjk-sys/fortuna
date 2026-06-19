import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-[hsl(240_3.7%_15.9%)] bg-[hsl(240_3.7%_10%)] px-3 py-2 text-sm text-white placeholder:text-[hsl(240_5%_64.9%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(142.4_71.8%_29.2%)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
