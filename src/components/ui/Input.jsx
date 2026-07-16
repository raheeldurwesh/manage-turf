import { forwardRef } from 'react'
import { cn } from '../../utils/helpers'

const Input = forwardRef(({ label, error, icon: Icon, className, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
        <input
          ref={ref}
          className={cn(
            'input-base',
            Icon && 'pl-10',
            error && 'border-red-400 dark:border-red-600 focus:ring-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
