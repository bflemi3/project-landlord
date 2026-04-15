'use client'

import { useState } from 'react'
import { AlertCircle, Copy, Check } from 'lucide-react'
import { InfoBox, InfoBoxIcon, InfoBoxContent } from '@/components/info-box'
import { Button } from '@/components/ui/button'

export function ErrorBox({ message }: { message: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <InfoBox variant="destructive">
      <InfoBoxIcon><AlertCircle /></InfoBoxIcon>
      <InfoBoxContent>
        <pre className="whitespace-pre-wrap font-mono text-sm">{message}</pre>
      </InfoBoxContent>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={handleCopy}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </InfoBox>
  )
}
