import clsx from 'clsx'
import type React from 'react'
import { forwardRef } from 'react'
import { Link } from './link'

const styles = {
  base: [
    // Base
    'relative rounded-lg border shadow-sm overflow-hidden',
    // Sizing and spacing
    'p-4 sm:p-6',
    // Focus
    'focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500',
  ],
  variants: {
    default: [
      // Base
      'bg-white border-zinc-950/10',
      // Dark mode
      'dark:bg-zinc-800 dark:border-white/10',
    ],
    outline: [
      // Base
      'border-zinc-950/10 bg-transparent',
      // Dark mode
      'dark:border-white/15 dark:bg-transparent',
    ],
    filled: [
      // Base
      'border-transparent',
      // Dark mode
      'dark:border-transparent',
    ],
  },
  colors: {
    white: ['bg-white text-zinc-950', 'dark:bg-zinc-900 dark:text-white'],
    zinc: ['bg-zinc-50 text-zinc-950', 'dark:bg-zinc-800/50 dark:text-white'],
    blue: ['bg-blue-50 text-blue-950', 'dark:bg-blue-900/20 dark:text-blue-100'],
    green: ['bg-green-50 text-green-950', 'dark:bg-green-900/20 dark:text-green-100'],
    red: ['bg-red-50 text-red-950', 'dark:bg-red-900/20 dark:text-red-100'],
    amber: ['bg-amber-50 text-amber-950', 'dark:bg-amber-900/20 dark:text-amber-100'],
  },
  sizes: {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  },
}

type CardAsProps = {
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

type CardAsLinkProps = {
  className?: string
  children: React.ReactNode
  href: string
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'className' | 'href'>

type BaseCardProps = CardAsProps | CardAsLinkProps

type CardProps = {
  variant?: 'default' | 'outline' | 'filled'
  color?: keyof typeof styles.colors
  size?: keyof typeof styles.sizes
} & BaseCardProps

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { variant = 'default', color, size = 'md', className, children, ...props },
  ref
) {
  const classes = clsx(
    className,
    styles.base,
    styles.variants[variant],
    size && styles.sizes[size],
    color && styles.colors[color]
  )

  return 'href' in props ? (
    <Link
      {...(props as CardAsLinkProps)}
      className={classes}
      ref={ref as React.ForwardedRef<HTMLAnchorElement>}
    >
      {children}
    </Link>
  ) : (
    <div
      {...(props as CardAsProps)}
      className={classes}
      ref={ref as React.ForwardedRef<HTMLDivElement>}
    >
      {children}
    </div>
  )
})

export function CardHeader({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={clsx(className, 'mb-4 flex flex-col space-y-1.5')}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3 {...props} className={clsx(className, 'text-lg font-medium text-zinc-950 dark:text-white')}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p {...props} className={clsx(className, 'text-sm text-zinc-500 dark:text-zinc-400')}>
      {children}
    </p>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={clsx(className, 'text-base text-zinc-700 dark:text-zinc-300')}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={clsx(className, 'mt-4 flex items-center justify-between')}>
      {children}
    </div>
  )
}
