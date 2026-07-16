import { cn } from '../../utils/helpers'

export default function Card({ children, className, hover = true, ...props }) {
  return (
    <div
      className={cn(
        hover ? 'glass-card' : 'glass-card-static',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100 dark:border-dark-700', className)}>
      {children}
    </div>
  )
}

export function CardContent({ children, className }) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}
