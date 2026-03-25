'use client'

import { motion, AnimatePresence } from 'motion/react'

interface SlideInProps {
  children: React.ReactNode
  activeKey: string | number
  duration?: number
  className?: string
}

export function SlideIn({
  children,
  activeKey,
  duration = 0.3,
  className,
}: SlideInProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        className={className}
        initial={{ transform: 'translateX(40px)', opacity: 0 }}
        animate={{ transform: 'translateX(0px)', opacity: 1 }}
        exit={{ transform: 'translateX(-40px)', opacity: 0 }}
        transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
