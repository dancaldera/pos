import clsx from 'clsx'
import { useLanguage } from '@/context/LanguageContext'

interface LoadingPageProps {
  /**
   * Optional custom message to display
   */
  message?: string
  /**
   * Optional className for additional styling
   */
  className?: string
  /**
   * Size of the loading spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Color of the loading spinner
   * @default 'blue'
   */
  color?: 'blue' | 'green' | 'amber' | 'red' | 'zinc'
  /**
   * Whether to show a fullscreen overlay
   * @default false
   */
  fullScreen?: boolean
}

/**
 * Loading page component that displays a spinner and optional message
 */
export function LoadingPage({
  message,
  className,
  size = 'md',
  color = 'blue',
  fullScreen = false,
}: LoadingPageProps) {
  const { translate } = useLanguage();
  
  const spinnerSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }
  
  const spinnerColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    zinc: 'text-zinc-600 dark:text-zinc-400',
  }
  
  const containerClasses = clsx(
    'flex flex-col items-center justify-center',
    fullScreen && 'fixed inset-0 bg-white/80 dark:bg-zinc-900/80 z-50',
    !fullScreen && 'p-8',
    className
  )
  
  return (
    <div className={containerClasses}>
      <div className="relative">
        {/* Spinner track */}
        <div className={clsx(
          'rounded-full border-4 border-zinc-200 dark:border-zinc-700',
          spinnerSizes[size]
        )} />
        
        {/* Spinner */}
        <div className={clsx(
          'absolute top-0 left-0 rounded-full border-4 border-t-transparent',
          spinnerSizes[size],
          spinnerColors[color],
          'animate-spin'
        )} />
      </div>
      
      <p className="mt-4 text-zinc-700 dark:text-zinc-300 font-medium">
        {message || translate.common('loading')}
      </p>
    </div>
  )
}

/**
 * Loading spinner component that can be used inline
 */
export function LoadingSpinner({
  className,
  size = 'sm',
  color = 'blue',
}: Omit<LoadingPageProps, 'message' | 'fullScreen'>) {
  const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  
  const spinnerColors = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    zinc: 'text-zinc-600 dark:text-zinc-400',
  }
  
  return (
    <div className={clsx('relative inline-block', className)}>
      {/* Spinner track */}
      <div className={clsx(
        'rounded-full border-2 border-zinc-200 dark:border-zinc-700',
        spinnerSizes[size]
      )} />
      
      {/* Spinner */}
      <div className={clsx(
        'absolute top-0 left-0 rounded-full border-2 border-t-transparent',
        spinnerSizes[size],
        spinnerColors[color],
        'animate-spin'
      )} />
    </div>
  )
}

/**
 * Skeleton loading component for content placeholders
 */
export function Skeleton({
  className,
  width,
  height,
}: {
  className?: string
  width?: string
  height?: string
}) {
  return (
    <div
      className={clsx(
        'animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded',
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  )
}
