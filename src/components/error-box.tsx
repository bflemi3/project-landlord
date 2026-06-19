'use client'

import { useState } from 'react'
import { AlertCircle, Copy, Check } from 'lucide-react'
import { Alert, AlertBody } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function ErrorBox({ message }: { message: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertBody>
        <pre className="font-mono text-sm whitespace-pre-wrap">{message}</pre>
      </AlertBody>
      <Button variant="ghost" size="icon" type="button" onClick={handleCopy}>
        {copied ? <Check /> : <Copy />}
      </Button>
    </Alert>
  )
}
