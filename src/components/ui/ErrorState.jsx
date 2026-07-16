import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

export default function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm" icon={RefreshCw}>
          Try Again
        </Button>
      )}
    </div>
  )
}
