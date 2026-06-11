'use client'

/*
 * Dev-only visual check: raw HTML mockup (left) vs the real React components
 * (right) for pixel-perfect comparison. Not linked anywhere; /preview/component-check.
 */

import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// --- raw mockup pill: EXACT spec from _badge-proposal.html `.pill`
//     (12px / padding 2px 10px / gap 6px / line-height 1.5 / no border).
const PILL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '2px 10px',
  borderRadius: 9999,
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 500,
  whiteSpace: 'nowrap',
}
const tints: Record<string, { bg: string; fg: string }> = {
  success: { bg: 'oklch(0.696 0.17 162.48 / 0.15)', fg: 'oklch(0.844 0.143 164.978)' },
  warning: { bg: 'oklch(0.769 0.188 70.08 / 0.15)', fg: 'oklch(0.879 0.169 91.605)' },
  destructive: { bg: 'oklch(0.645 0.246 16.439 / 0.15)', fg: 'oklch(0.81 0.117 11.638)' },
  primary: { bg: 'oklch(0.704 0.14 182.503 / 0.15)', fg: 'oklch(0.855 0.138 182.503)' },
  info: { bg: 'oklch(0.685 0.169 237.323 / 0.15)', fg: 'oklch(0.828 0.111 230.318)' },
  highlight: { bg: 'oklch(0.63 0.23 357 / 0.15)', fg: 'oklch(0.8 0.11 357)' },
}

function RawPill({
  tint,
  children,
  dot = true,
  ring = false,
  dashed = false,
}: {
  tint?: keyof typeof tints
  children: React.ReactNode
  dot?: boolean
  ring?: boolean
  dashed?: boolean
}) {
  const t = tint ? tints[tint] : undefined
  const style: React.CSSProperties = { ...PILL }
  if (t) {
    style.background = t.bg
    style.color = t.fg
  } else {
    // neutral
    style.background = 'rgba(255,255,255,0.04)'
    style.color = '#a8a29e'
  }
  if (dashed) {
    style.background = 'transparent'
    style.border = '1px dashed rgba(255,255,255,0.2)'
    style.color = '#a8a29e'
  }
  if (ring) {
    style.boxShadow = '0 0 0 2px #1a1a19, 0 0 0 4px oklch(0.63 0.23 357 / 0.4)'
  }
  return (
    <span style={style}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}

function Row({ label, raw, live }: { label: string; raw: React.ReactNode; live: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] items-center gap-6 border-t border-white/6 py-4">
      <span className="font-mono text-[11px] text-[#57534e]">{label}</span>
      <div className="flex">{raw}</div>
      <div className="flex">{live}</div>
    </div>
  )
}

export default function ComponentCheck() {
  return (
    <div className="bg-background text-muted-foreground min-h-svh p-12 font-sans text-sm">
      <h1 className="text-foreground mb-2 font-mono text-[13px] tracking-[0.16em] uppercase">
        Component check · raw mockup vs live components
      </h1>
      <div className="mb-6 grid grid-cols-[120px_1fr_1fr] gap-6 font-mono text-[11px] text-[#57534e]">
        <span />
        <span>RAW HTML MOCKUP</span>
        <span>LIVE COMPONENT</span>
      </div>

      <Row
        label="paid"
        raw={<RawPill tint="success">Paid</RawPill>}
        live={<StatusBadge variant="paid">Paid</StatusBadge>}
      />
      <Row
        label="paid · spotlight"
        raw={
          <RawPill tint="success" ring>
            Paid
          </RawPill>
        }
        live={
          <StatusBadge variant="paid" spotlight>
            Paid
          </StatusBadge>
        }
      />
      <Row
        label="due"
        raw={<RawPill tint="warning">Due</RawPill>}
        live={<StatusBadge variant="pending">Due</StatusBadge>}
      />
      <Row
        label="overdue"
        raw={<RawPill tint="destructive">Overdue</RawPill>}
        live={<StatusBadge variant="overdue">Overdue</StatusBadge>}
      />
      <Row
        label="published"
        raw={<RawPill tint="primary">Published</RawPill>}
        live={<StatusBadge variant="published">Published</StatusBadge>}
      />
      <Row
        label="awaiting"
        raw={<RawPill>Awaiting</RawPill>}
        live={<StatusBadge variant="default">Awaiting</StatusBadge>}
      />
      <Row
        label="draft"
        raw={
          <RawPill dashed dot={false}>
            Draft
          </RawPill>
        }
        live={<StatusBadge variant="draft">Draft</StatusBadge>}
      />
      <Row
        label="in review"
        raw={
          <RawPill tint="info" dot={false}>
            In review
          </RawPill>
        }
        live={<Badge variant="info-subtle">In review</Badge>}
      />
      <Row
        label="highlight + dot"
        raw={<RawPill tint="highlight">New</RawPill>}
        live={
          <Badge variant="highlight-subtle" className="gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            New
          </Badge>
        }
      />
      <Row
        label="solid primary"
        raw={
          <span style={{ ...PILL, background: 'oklch(0.704 0.14 182.503)', color: '#fff' }}>
            Primary
          </span>
        }
        live={<Badge>Primary</Badge>}
      />
      <Row
        label="solid highlight"
        raw={
          <span style={{ ...PILL, background: 'oklch(0.63 0.23 357)', color: '#fff' }}>
            Highlight
          </span>
        }
        live={<Badge variant="highlight">Highlight</Badge>}
      />

      <h2 className="text-foreground mt-12 mb-4 font-mono text-[11px] tracking-[0.16em] uppercase">
        Tabs
      </h2>
      <div className="grid grid-cols-2 gap-10">
        <div>
          <p className="mb-3 font-mono text-[11px] text-[#57534e]">RAW HTML MOCKUP</p>
          <div className="border-border flex items-center gap-1 border-b">
            <span className="text-foreground after:bg-foreground relative px-3 py-2 text-sm font-medium after:absolute after:inset-x-3 after:-bottom-px after:h-px">
              All charges
            </span>
            <span className="text-muted-foreground px-3 py-2 text-sm font-medium">Rent</span>
            <span className="text-muted-foreground px-3 py-2 text-sm font-medium">Bills</span>
            <span className="text-muted-foreground px-3 py-2 text-sm font-medium">Contract</span>
          </div>
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] text-[#57534e]">LIVE COMPONENT</p>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All charges</TabsTrigger>
              <TabsTrigger value="rent">Rent</TabsTrigger>
              <TabsTrigger value="bills">Bills</TabsTrigger>
              <TabsTrigger value="contract">Contract</TabsTrigger>
            </TabsList>
            <TabsContent value="all" />
          </Tabs>
        </div>
      </div>
    </div>
  )
}
