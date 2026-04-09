'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'

const slideTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }

export function AnimatedStepTransition({
  codeValidated,
  inviteCodeStep,
  signUpStep,
}: {
  codeValidated: boolean
  inviteCodeStep: ReactNode
  signUpStep: ReactNode
}) {
  return (
    <AnimatePresence mode="wait">
      {!codeValidated ? (
        <motion.div
          key="invite-code"
          initial={{ x: 0, opacity: 1 }}
          exit={{ x: -200, opacity: 0 }}
          transition={slideTransition}
        >
          {inviteCodeStep}
        </motion.div>
      ) : (
        <motion.div
          key="sign-up-form"
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={slideTransition}
        >
          {signUpStep}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
