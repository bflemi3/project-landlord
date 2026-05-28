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
      className="font-display text-[34px] font-medium leading-[1.08] tracking-[-0.02em] text-[#f5f5f4] md:text-[44px]"
      {...omitNode(props)}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-14 font-display text-[22px] font-medium leading-[1.15] tracking-[-0.01em] text-[#f5f5f4] md:text-[26px]"
      {...omitNode(props)}
    />
  ),
  h3: (props) => (
    <h3 className="mt-8 text-[15px] font-medium uppercase tracking-[0.10em] text-[#d6d3d1]" {...omitNode(props)} />
  ),
  p: (props) => <p className="mt-5 text-[15.5px] leading-[1.7] text-[#a8a29e]" {...omitNode(props)} />,
  ul: (props) => <ul className="mt-5 space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />,
  ol: (props) => <ol className="mt-5 list-decimal space-y-2.5 pl-5 marker:text-[#78716c]" {...omitNode(props)} />,
  li: (props) => (
    <li className="list-disc text-[15.5px] leading-[1.65] text-[#a8a29e] marker:text-[#78716c]" {...omitNode(props)} />
  ),
  a: ({ href, ...props }) => {
    const className =
      'font-medium text-[#f0a4c5] underline underline-offset-4 transition-colors hover:text-[#f5f5f4]'
    return href?.startsWith('/') ? (
      <Link href={href} className={className} {...omitNode(props)} />
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...omitNode(props)} />
    )
  },
  strong: (props) => <strong className="font-medium text-[#f5f5f4]" {...omitNode(props)} />,
  code: (props) => (
    <code
      className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-[#d6d3d1]"
      {...omitNode(props)}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mt-10 rounded-2xl border border-[#e9408f]/25 bg-[#e9408f]/[0.06] px-5 py-4 text-[14px] leading-[1.6] text-[#d6d3d1] [&>p]:mt-0 [&>p]:text-[#d6d3d1]"
      {...omitNode(props)}
    />
  ),
  hr: () => <hr className="mt-12 border-white/[0.08]" />,
}

const componentsNoH1: Components = { ...components, h1: () => null }

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
        'dark min-h-svh bg-[#141413] font-editorial text-[#f5f5f4] selection:bg-[#e9408f]/30 selection:text-[#f5f5f4]',
        className,
      )}
    >
      <div className="mx-auto max-w-3xl px-6 pt-6 pb-14 md:pt-8 md:pb-20">{children}</div>
    </main>
  )
}

function MarkdownDocumentHeader({
  title,
  subtitle,
  className,
}: {
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div data-slot="markdown-document-header" className={cn('mt-10', className)}>
      <h1 className="font-display text-[34px] font-medium leading-[1.08] tracking-[-0.02em] text-[#f5f5f4] md:text-[44px]">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-[15.5px] leading-[1.7] text-[#a8a29e]">{subtitle}</p>}
    </div>
  )
}

function MarkdownDocumentContent({
  children,
  hideH1,
  className,
}: {
  children: string
  hideH1?: boolean
  className?: string
}) {
  return (
    <article data-slot="markdown-document-content" className={cn('mt-10', className)}>
      <Markdown components={hideH1 ? componentsNoH1 : components}>{children}</Markdown>
    </article>
  )
}

export { MarkdownDocument, MarkdownDocumentHeader, MarkdownDocumentContent }
