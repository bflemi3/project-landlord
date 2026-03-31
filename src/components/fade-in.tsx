'use client'

import { motion } from 'motion/react'

/**
 * Fades in its children when mounted.
 */
export function FadeIn({
  children,
  className,
  duration = 0.8,
}: {
  children: React.ReactNode
  className?: string
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
