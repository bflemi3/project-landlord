import fs from 'node:fs'
import path from 'node:path'
import { BackButton } from '@/components/back-button'
import { MarkdownDocument, MarkdownDocumentContent } from '@/components/markdown-document'

export const metadata = { title: "What's new" }

export default function ChangelogPage() {
  const content = fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')

  return (
    <MarkdownDocument>
      <BackButton />
      <MarkdownDocumentContent>{content}</MarkdownDocumentContent>
    </MarkdownDocument>
  )
}
