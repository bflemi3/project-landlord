'use client'

import { useState, useRef, useEffect } from 'react'
import { PREVIEW_STATES } from '@/app/preview/mock-data'

const stateKeys = Object.keys(PREVIEW_STATES)

export default function PreviewHomePage() {
  const [activeState, setActiveState] = useState(stateKeys[0])
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const frameUrl = `/preview/home/frame?state=${activeState}`
  const width = viewport === 'mobile' ? 390 : 1280
  const height = viewport === 'mobile' ? 844 : 800

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
    }
  }

  return (
    <div className="flex h-svh">
      {/* State selector panel */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border bg-card/50 dark:bg-zinc-900/50">
        <div className="border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-foreground">States</h2>
            <div className="flex rounded-md border border-border bg-secondary/50 p-0.5">
              <button
                onClick={() => setViewport('mobile')}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  viewport === 'mobile' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Mobile
              </button>
              <button
                onClick={() => setViewport('desktop')}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  viewport === 'desktop' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Desktop
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-1.5">
          {stateKeys.map((key) => {
            const state = PREVIEW_STATES[key]
            const isActive = key === activeState
            return (
              <button
                key={key}
                onClick={() => setActiveState(key)}
                className={`mb-0.5 block w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <p className="text-xs font-medium">{state.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{state.description}</p>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Preview area */}
      <main className="flex flex-1 items-start justify-center overflow-auto p-8">
        <div
          className="overflow-hidden rounded-2xl border border-border shadow-xl transition-all duration-300"
          style={{ width, height }}
        >
          <iframe
            ref={iframeRef}
            key={activeState}
            src={frameUrl}
            onLoad={handleIframeLoad}
            className="h-full w-full border-0"
            title="Home screen preview"
          />
        </div>
      </main>
    </div>
  )
}
