import fs from 'node:fs'
import path from 'node:path'
import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import { BackButton } from '@/components/back-button'

const components: Components = {
  h1: () => null, // Skip the markdown h1 — we render our own header
  h2: (props) => (
    <h2
      className="mt-10 border-b border-border pb-2 text-lg font-medium text-muted-foreground first:mt-0"
      {...props}
    />
  ),
  h3: (props) => <h3 className="mt-6 text-base font-medium" {...props} />,
  p: (props) => <p className="mt-4 text-base leading-relaxed" {...props} />,
  ul: (props) => <ul className="mt-4 list-disc space-y-1.5 pl-6" {...props} />,
  ol: (props) => <ol className="mt-4 list-decimal space-y-1.5 pl-6" {...props} />,
  li: (props) => <li className="text-base leading-relaxed" {...props} />,
  a: (props) => (
    <a
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
  hr: () => <hr className="my-8 border-border" />,
}

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md')
  const content = fs.readFileSync(filePath, 'utf-8')

  return (
    <main className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 bg-background px-6 pt-4 pb-6">
        <div className="mx-auto max-w-lg">
          <BackButton />
          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight">What&apos;s new</h1>
            <p className="mt-2 text-base text-muted-foreground">
              See what we&apos;ve been working on to make mabenn better for you.
            </p>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-6 pb-12">
        <article className="mx-auto max-w-lg">
          <Markdown components={components}>{content}</Markdown>
        </article>
      </div>
    </main>
  )
}
