import { cn } from '../../utils/helpers'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  outline: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
}

const sizes = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-6 py-3',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      className={cn(variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  )
}
