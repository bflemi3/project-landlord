import { Button, Section } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section className="px-0 py-2">
      <Button
        className="bg-primary block rounded-xl px-6 py-3 text-center text-base font-bold text-white no-underline"
        href={href}
      >
        {children}
      </Button>
    </Section>
  )
}
