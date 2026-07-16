import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/helpers'

const Select = forwardRef(({ label, error, options = [], placeholder, className, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'input-base appearance-none pr-10',
            error && 'border-red-400 dark:border-red-600 focus:ring-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
