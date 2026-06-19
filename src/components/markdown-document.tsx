import Link from 'next/link'
import Markdown, { type Components } from 'react-markdown'
import { cn } from '@/lib/utils'

function omitNode<T extends { node?: unknown }>(props: T) {
  const rest = { ...props }
  delete rest.node
  return rest
}

const components: Components = {
  h1: (props) => (
    <h1
      className="font-display text-[34px] leading-[1.08] font-medium tracking-[-0.02em] text-[#f5f5f4] md:text-[44px]"
      {...omitNode(props)}
    />
  ),
  h2: (props) => (
    <h2
      className="font-display mt-14 text-[22px] leading-[1.15] font-medium tracking-[-0.01em] text-[#f5f5f4] md:text-[26px]"
      {...omitNode(props)}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-8 text-[15px] font-medium tracking-widest text-[#d6d3d1] uppercase"
      {...omitNode(props)}
    />
  ),
  p: (props) => (
    <p className="mt-5 text-[15.5px] leading-[1.7] text-[#a8a29e]" {...omitNode(props)} />
  ),
  ul: (props) => (
    <ul className="mt-5 list-disc space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />
  ),
  ol: (props) => (
    <ol className="mt-5 list-decimal space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />
  ),
  li: (props) => (
    <li
      className="text-[15.5px] leading-[1.65] text-[#a8a29e] marker:text-[#78716c]"
      {...omitNode(props)}
    />
  ),
  a: ({ href, ...props }) => {
    const className =
      'font-medium text-[#f0a4c5] underline underline-offset-4 transition-colors hover:text-[#f5f5f4]'
    const cleaned = omitNode(props)
    if (href?.startsWith('http')) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...cleaned}
          className={className}
        />
      )
    }
    // The `//` guard keeps protocol-relative URLs out of next/link.
    if (href?.startsWith('/') && !href.startsWith('//')) {
      return <Link href={href} {...cleaned} className={className} />
    }
    return <a href={href} {...cleaned} className={className} />
  },
  strong: (props) => <strong className="font-medium text-[#f5f5f4]" {...omitNode(props)} />,
  code: (props) => (
    <code
      className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-[13px] text-[#d6d3d1]"
      {...omitNode(props)}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mt-10 rounded-2xl border border-[#e9408f]/25 bg-[#e9408f]/6 px-5 py-4 text-[14px] leading-[1.6] text-[#d6d3d1] [&>p]:mt-0 [&>p]:text-[#d6d3d1]"
      {...omitNode(props)}
    />
  ),
  hr: () => <hr className="mt-12 border-white/8" />,
}

function MarkdownDocument({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <main
      data-slot="markdown-document"
      className={cn(
        'dark font-editorial min-h-svh bg-[#141413] text-[#f5f5f4] selection:bg-[#e9408f]/30 selection:text-[#f5f5f4]',
        className,
      )}
    >
      <div className="mx-auto max-w-3xl px-6 pt-6 pb-14 md:pt-8 md:pb-20">{children}</div>
    </main>
  )
}

function MarkdownDocumentContent({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <article data-slot="markdown-document-content" className={cn('mt-10', className)}>
      <Markdown components={components}>{children}</Markdown>
    </article>
  )
}

export { MarkdownDocument, MarkdownDocumentContent }
