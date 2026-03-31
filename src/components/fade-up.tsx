'use client'

import { createContext, useContext } from 'react'
import { motion } from 'motion/react'

const fadeUpVariants = {
  hidden: { opacity: 0, transform: 'translateY(16px)' },
  visible: (delay: number) => ({
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
}

const staggerContext = createContext<{ baseDelay: number; stagger: number; index: number } | null>(null)

interface FadeUpProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

/**
 * Fade-up animation wrapper.
 *
 * Standalone: `<FadeUp delay={0.1}>...</FadeUp>`
 * In a group: delay is auto-calculated from stagger — manual delay is ignored.
 */
function FadeUp({ children, delay = 0, className }: FadeUpProps) {
  const stagger = useContext(staggerContext)
  const resolvedDelay = stagger
    ? stagger.baseDelay + stagger.index * stagger.stagger
    : delay

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      custom={resolvedDelay}
    >
      {children}
    </motion.div>
  )
}

interface FadeUpGroupProps {
  children: React.ReactNode
  baseDelay?: number
  stagger?: number
  className?: string
}

/**
 * Auto-staggers FadeUp children.
 *
 * ```tsx
 * <FadeUp.Group stagger={0.08}>
 *   <FadeUp>First</FadeUp>   // delay: 0
 *   <FadeUp>Second</FadeUp>  // delay: 0.08
 *   <FadeUp>Third</FadeUp>   // delay: 0.16
 * </FadeUp.Group>
 * ```
 */
function FadeUpGroup({ children, baseDelay = 0, stagger: staggerAmount = 0.08, className }: FadeUpGroupProps) {
  let index = 0

  const wrappedChildren = Array.isArray(children) ? children : [children]

  return (
    <div className={className}>
      {wrappedChildren.map((child, i) => {
        // Only count FadeUp children for stagger index
        const isFadeUp =
          child &&
          typeof child === 'object' &&
          'type' in child &&
          (child.type === FadeUp || child.type === FadeUpItem)

        const currentIndex = isFadeUp ? index++ : 0

        if (isFadeUp) {
          return (
            <staggerContext.Provider
              key={i}
              value={{ baseDelay, stagger: staggerAmount, index: currentIndex }}
            >
              {child}
            </staggerContext.Provider>
          )
        }

        return child
      })}
    </div>
  )
}

// Alias for clarity when used inside groups
const FadeUpItem = FadeUp

FadeUp.Group = FadeUpGroup

export { FadeUp, FadeUpGroup }
