import { Button, Section } from '@react-email/components'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section className="py-2 px-0">
      <Button
        className="bg-primary rounded-xl font-bold text-white text-base no-underline text-center block py-3 px-6"
        href={href}
      >
        {children}
      </Button>
    </Section>
  )
}
