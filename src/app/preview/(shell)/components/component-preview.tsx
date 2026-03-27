'use client'

import { useState, useRef, useEffect } from 'react'

interface Variant {
  label: string
  frameUrl: string
  /** Height hint for the iframe. Defaults to 200. */
  height?: number
}

export function ComponentPreview({
  title,
  description,
  variants,
}: {
  title: string
  description: string
  variants: Variant[]
}) {
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile')
  const width = viewport === 'mobile' ? 390 : 1024

  return (
    <div className="h-svh overflow-y-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 px-6 py-3 backdrop-blur-lg dark:bg-zinc-900/80">
        <div>
          <h1 className="text-sm font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex rounded-md border border-border bg-secondary/50 p-0.5">
          <button
            onClick={() => setViewport('mobile')}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              viewport === 'mobile' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Mobile
          </button>
          <button
            onClick={() => setViewport('desktop')}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              viewport === 'desktop' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Desktop
          </button>
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-8 p-8">
        {variants.map((variant, i) => (
          <VariantBlock key={i} variant={variant} width={width} />
        ))}
      </div>
    </div>
  )
}

function VariantBlock({ variant, width }: { variant: Variant; width: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(variant.height ?? 200)

  // Sync theme with iframe
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      const iframe = iframeRef.current
      if (iframe?.contentDocument) {
        iframe.contentDocument.documentElement.classList.toggle('dark', isDark)
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function handleIframeLoad() {
    const isDark = document.documentElement.classList.contains('dark')
    const iframe = iframeRef.current
    if (iframe?.contentDocument) {
      iframe.contentDocument.documentElement.classList.toggle('dark', isDark)
      // Auto-size to content
      const body = iframe.contentDocument.body
      if (body) {
        const h = body.scrollHeight
        if (h > 0) setIframeHeight(h)
      }
    }
  }

  return (
    <div className="flex justify-center">
      <div style={{ width }}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{variant.label}</p>
        <div
          className="overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-300"
        >
          <iframe
            ref={iframeRef}
            src={variant.frameUrl}
            onLoad={handleIframeLoad}
            className="w-full border-0"
            style={{ height: iframeHeight }}
            title={variant.label}
          />
        </div>
      </div>
    </div>
  )
}
