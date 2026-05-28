import fs from 'node:fs'
import path from 'node:path'
import { BackButton } from '@/components/back-button'
import {
  MarkdownDocument,
  MarkdownDocumentContent,
  MarkdownDocumentHeader,
} from '@/components/markdown-document'

export const metadata = { title: "What's new" }

export default function ChangelogPage() {
  const content = fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')

  return (
    <MarkdownDocument>
      <BackButton />
      <MarkdownDocumentHeader
        title="What's new"
        subtitle="See what we've been working on to make Mabenn better for you."
      />
      <MarkdownDocumentContent hideH1>{content}</MarkdownDocumentContent>
    </MarkdownDocument>
  )
}
