# Playground UI Shared Components — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all shared components and utilities needed by the engineering playground pages — threshold status system, charts, PDF viewer, test case view primitives, empty state, and JSON viewer.

**Architecture:** Eng-specific components live in `src/components/eng/`. The Bill PDF viewer lives in `src/components/` (shared — will be reused in user-facing app). Threshold status is a hook + utility + two presentational components. Charts use Recharts (installed in Plan 3a-1). Test case view primitives are reusable building blocks that both test case detail pages and fix request detail pages compose from.

**Tech Stack:** React, TypeScript, Tailwind CSS, Recharts, react-pdf (@react-pdf/renderer is NOT used — we use `pdfjs-dist` for viewing), shadcn/ui (Badge, Card, Tooltip)

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plan 3a-1 (database & infrastructure — installs Recharts, sets up eng route group)
**Blocks:** Plans 3a-3 through 3a-5

---

## File Structure

```
src/
  lib/
    eng/
      threshold.ts                          # useThresholdStatus hook, thresholdColor utility
  components/
    bill-pdf-viewer.tsx                     # Shared PDF viewer (used in eng + future user app)
    eng/
      threshold-badge.tsx                   # ThresholdBadge component
      threshold-text.tsx                    # ThresholdText component
      threshold-management.tsx              # Threshold editing panel (reusable)
      sparkline.tsx                         # Small inline trend chart
      trend-chart.tsx                       # Full interactive accuracy chart
      test-case-layout.tsx                  # Multi-panel layout for test case views
      source-data-panel.tsx                 # Primary source data panel
      external-data-panel.tsx               # External API/scrape data panel
      expected-results-panel.tsx            # Expected vs actual results panel
      empty-state.tsx                       # Consistent empty state pattern
      json-viewer.tsx                       # Collapsible JSON tree viewer
```

---

### Task 1: Threshold Status Utility — `useThresholdStatus` hook and `thresholdColor`

**Files:**
- Create: `src/lib/eng/threshold.ts`

This is the core utility that everything else references for threshold-aware coloring. Three-tier system: green (above), yellow (within `nearPercent` of threshold), red (below). Default `nearPercent` is 5 (meaning within 5 percentage points).

- [ ] **Step 1: Create the threshold utility**

```typescript
// src/lib/eng/threshold.ts

export type ThresholdStatus = 'above' | 'near' | 'below'

/**
 * Determine threshold status for a value against a threshold.
 *
 * - 'above': value >= threshold
 * - 'near': value < threshold but within nearPercent points
 * - 'below': value < threshold - nearPercent
 *
 * @param value - The current accuracy/confidence value (0-1 scale, e.g. 0.95)
 * @param threshold - The threshold to compare against (0-1 scale, e.g. 0.95)
 * @param nearPercent - How many percentage points below threshold counts as "near" (default 5)
 */
export function getThresholdStatus(
  value: number,
  threshold: number,
  nearPercent: number = 5,
): { status: ThresholdStatus; delta: number } {
  const delta = value - threshold
  const nearDelta = nearPercent / 100

  if (value >= threshold) {
    return { status: 'above', delta }
  }

  if (value >= threshold - nearDelta) {
    return { status: 'near', delta }
  }

  return { status: 'below', delta }
}

/**
 * CSS class string for threshold status coloring.
 * Maps to design system semantic colors: emerald (success), amber (warning), rose (destructive).
 */
export function thresholdColor(status: ThresholdStatus): string {
  switch (status) {
    case 'above':
      return 'text-emerald-700 dark:text-emerald-400'
    case 'near':
      return 'text-amber-700 dark:text-amber-400'
    case 'below':
      return 'text-destructive'
  }
}

/**
 * Background variant for badges and indicators.
 */
export function thresholdBgColor(status: ThresholdStatus): string {
  switch (status) {
    case 'above':
      return 'bg-success/10 text-emerald-700 dark:text-emerald-400'
    case 'near':
      return 'bg-warning/10 text-amber-700 dark:text-amber-400'
    case 'below':
      return 'bg-destructive/10 text-destructive'
  }
}

/**
 * Recharts stroke color for sparklines and trend charts.
 */
export function thresholdStrokeColor(status: ThresholdStatus): string {
  switch (status) {
    case 'above':
      return '#059669' // emerald-600
    case 'near':
      return '#d97706' // amber-600
    case 'below':
      return '#e11d48' // rose-600
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/eng/threshold.ts
git commit -m "feat(eng): add threshold status utility with color helpers"
```

---

### Task 2: ThresholdBadge Component

**Files:**
- Create: `src/components/eng/threshold-badge.tsx`

A colored badge showing an accuracy/confidence value with threshold-aware styling. Wraps the existing shadcn `Badge` pattern but uses threshold-derived colors. Used in tables (provider registry, profile lists, accuracy dashboard).

- [ ] **Step 1: Create ThresholdBadge**

```tsx
// src/components/eng/threshold-badge.tsx
'use client'

import { cn } from '@/lib/utils'
import {
  getThresholdStatus,
  thresholdBgColor,
  type ThresholdStatus,
} from '@/lib/eng/threshold'

interface ThresholdBadgeProps {
  /** Accuracy/confidence value, 0-1 scale */
  value: number
  /** Threshold to compare against, 0-1 scale */
  threshold: number
  /** Percentage points below threshold that counts as "near" (default 5) */
  nearPercent?: number
  /** Display format: 'percent' shows "95.0%", 'decimal' shows "0.950" */
  format?: 'percent' | 'decimal'
  /** Optional override for status (skip computation) */
  status?: ThresholdStatus
  className?: string
}

export function ThresholdBadge({
  value,
  threshold,
  nearPercent = 5,
  format = 'percent',
  status: statusOverride,
  className,
}: ThresholdBadgeProps) {
  const { status } = statusOverride
    ? { status: statusOverride }
    : getThresholdStatus(value, threshold, nearPercent)

  const displayValue =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : value.toFixed(4)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        thresholdBgColor(status),
        className,
      )}
    >
      {displayValue}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/threshold-badge.tsx
git commit -m "feat(eng): add ThresholdBadge component"
```

---

### Task 3: ThresholdText Component

**Files:**
- Create: `src/components/eng/threshold-text.tsx`

Inline colored number for use in running text, stat cards, or anywhere a badge is too heavy. Just the number with threshold-aware text color.

- [ ] **Step 1: Create ThresholdText**

```tsx
// src/components/eng/threshold-text.tsx
'use client'

import { cn } from '@/lib/utils'
import {
  getThresholdStatus,
  thresholdColor,
  type ThresholdStatus,
} from '@/lib/eng/threshold'

interface ThresholdTextProps {
  /** Accuracy/confidence value, 0-1 scale */
  value: number
  /** Threshold to compare against, 0-1 scale */
  threshold: number
  /** Percentage points below threshold that counts as "near" (default 5) */
  nearPercent?: number
  /** Display format: 'percent' shows "95.0%", 'decimal' shows "0.950" */
  format?: 'percent' | 'decimal'
  /** Optional override for status (skip computation) */
  status?: ThresholdStatus
  /** Show +/- delta from threshold */
  showDelta?: boolean
  className?: string
}

export function ThresholdText({
  value,
  threshold,
  nearPercent = 5,
  format = 'percent',
  status: statusOverride,
  showDelta = false,
  className,
}: ThresholdTextProps) {
  const { status, delta } = statusOverride
    ? { status: statusOverride, delta: value - threshold }
    : getThresholdStatus(value, threshold, nearPercent)

  const displayValue =
    format === 'percent'
      ? `${(value * 100).toFixed(1)}%`
      : value.toFixed(4)

  const deltaDisplay = showDelta
    ? ` (${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pp)`
    : ''

  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        thresholdColor(status),
        className,
      )}
    >
      {displayValue}
      {deltaDisplay && (
        <span className="text-xs font-normal opacity-70">{deltaDisplay}</span>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/threshold-text.tsx
git commit -m "feat(eng): add ThresholdText inline colored number component"
```

---

### Task 4: Sparkline Component

**Files:**
- Create: `src/components/eng/sparkline.tsx`

Small inline chart (~28px height) using Recharts. No axes, labels, or interactivity. Color follows threshold status of the latest value. Used in provider registry tables, profile lists, and accuracy dashboard tables.

- [ ] **Step 1: Create Sparkline**

```tsx
// src/components/eng/sparkline.tsx
'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import {
  getThresholdStatus,
  thresholdStrokeColor,
} from '@/lib/eng/threshold'
import { cn } from '@/lib/utils'

export interface SparklineDataPoint {
  value: number
}

interface SparklineProps {
  /** Array of data points (most recent last) */
  data: SparklineDataPoint[]
  /** Threshold to determine color of the line */
  threshold: number
  /** Width in pixels (default 80) */
  width?: number
  /** Height in pixels (default 28) */
  height?: number
  /** Percentage points below threshold that counts as "near" (default 5) */
  nearPercent?: number
  className?: string
}

export function Sparkline({
  data,
  threshold,
  width = 80,
  height = 28,
  nearPercent = 5,
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <span
        className={cn('inline-block text-xs text-muted-foreground', className)}
        style={{ width, height, lineHeight: `${height}px` }}
      >
        —
      </span>
    )
  }

  const latestValue = data[data.length - 1].value
  const { status } = getThresholdStatus(latestValue, threshold, nearPercent)
  const strokeColor = thresholdStrokeColor(status)

  return (
    <div className={cn('inline-block', className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/sparkline.tsx
git commit -m "feat(eng): add Sparkline chart component using Recharts"
```

---

### Task 5: TrendChart Component

**Files:**
- Create: `src/components/eng/trend-chart.tsx`

Full-size interactive accuracy chart using Recharts. Shows historical test run results with axes, tooltips, hover detail, threshold line overlay, and annotations. Used in accuracy dashboard (system health) and profile overview tab.

- [ ] **Step 1: Create TrendChart**

```tsx
// src/components/eng/trend-chart.tsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import { thresholdStrokeColor, getThresholdStatus } from '@/lib/eng/threshold'
import { cn } from '@/lib/utils'

export interface TrendDataPoint {
  /** ISO date string or label for x-axis */
  date: string
  /** Accuracy value, 0-1 scale */
  value: number
  /** Optional annotation text (threshold change, capability added, etc.) */
  annotation?: string
}

interface TrendChartProps {
  /** Array of data points (oldest first) */
  data: TrendDataPoint[]
  /** Threshold line value (0-1 scale) */
  threshold: number
  /** Chart height in pixels (default 280) */
  height?: number
  /** Percentage points below threshold for "near" color (default 5) */
  nearPercent?: number
  /** Label for the threshold line */
  thresholdLabel?: string
  className?: string
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: TrendDataPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  const data = point.payload

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{formatDate(label ?? '')}</p>
      <p className="tabular-nums">
        Accuracy: {(point.value * 100).toFixed(1)}%
      </p>
      {data.annotation && (
        <p className="mt-1 text-xs text-muted-foreground">{data.annotation}</p>
      )}
    </div>
  )
}

function AnnotationDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as {
    cx: number
    cy: number
    payload: TrendDataPoint
  }
  if (!payload?.annotation) return <Dot {...(props as Record<string, unknown>)} r={0} />
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="currentColor" className="text-primary" />
      <circle cx={cx} cy={cy} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
    </g>
  )
}

export function TrendChart({
  data,
  threshold,
  height = 280,
  nearPercent = 5,
  thresholdLabel = 'Min accuracy',
  className,
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-sm text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        No test run data yet
      </div>
    )
  }

  const latestValue = data[data.length - 1].value
  const { status } = getThresholdStatus(latestValue, threshold, nearPercent)
  const lineColor = thresholdStrokeColor(status)

  // Y-axis domain: from slightly below min value to 1.0
  const minValue = Math.min(...data.map((d) => d.value))
  const yMin = Math.max(0, Math.floor(minValue * 20) / 20 - 0.05) // Round down to nearest 5%

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-border"
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[yMin, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={threshold}
            stroke="#94a3b8" // slate-400
            strokeDasharray="6 4"
            label={{
              value: thresholdLabel,
              position: 'insideTopRight',
              fill: '#94a3b8',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={<AnnotationDot />}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/trend-chart.tsx
git commit -m "feat(eng): add TrendChart interactive accuracy chart component"
```

---

### Task 6: Threshold Management Component

**Files:**
- Create: `src/components/eng/threshold-management.tsx`

Reusable threshold editing panel used on the accuracy dashboard (system defaults) and profile overview tab. Shows current values, edit controls, tooltip explanations, contextual guidance, and requires a reason for changes.

- [ ] **Step 1: Create ThresholdManagement**

```tsx
// src/components/eng/threshold-management.tsx
'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ThresholdText } from '@/components/eng/threshold-text'
import { cn } from '@/lib/utils'
import { CircleHelp, Pencil, Check, X } from 'lucide-react'

export interface ThresholdConfig {
  key: string
  label: string
  description: string
  value: number
  /** Min allowed value (0-1 scale) */
  min?: number
  /** Max allowed value (0-1 scale) */
  max?: number
}

interface ThresholdManagementProps {
  title: string
  thresholds: ThresholdConfig[]
  /** Current accuracy value for contextual display (0-1 scale) */
  currentAccuracy?: number
  /** Number of test cases for contextual guidance */
  testCaseCount?: number
  /** Contextual guidance lines (computed by parent based on data) */
  guidance?: string[]
  /** Called when a threshold is saved */
  onSave: (key: string, newValue: number, reason: string) => void | Promise<void>
  /** Whether saves are in progress */
  saving?: boolean
  className?: string
}

interface EditingState {
  key: string
  value: string
  reason: string
}

export function ThresholdManagement({
  title,
  thresholds,
  currentAccuracy,
  testCaseCount,
  guidance,
  onSave,
  saving = false,
  className,
}: ThresholdManagementProps) {
  const [editing, setEditing] = React.useState<EditingState | null>(null)

  function startEditing(threshold: ThresholdConfig) {
    setEditing({
      key: threshold.key,
      value: (threshold.value * 100).toFixed(1),
      reason: '',
    })
  }

  function cancelEditing() {
    setEditing(null)
  }

  async function handleSave() {
    if (!editing || !editing.reason.trim()) return
    const newValue = parseFloat(editing.value) / 100
    if (isNaN(newValue) || newValue < 0 || newValue > 1) return
    await onSave(editing.key, newValue, editing.reason.trim())
    setEditing(null)
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {thresholds.map((t) => {
          const isEditing = editing?.key === t.key

          return (
            <div key={t.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{t.label}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <CircleHelp className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      {t.description}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    {currentAccuracy !== undefined && t.key === 'min_accuracy' && (
                      <ThresholdText
                        value={currentAccuracy}
                        threshold={t.value}
                        format="percent"
                        showDelta
                        className="text-xs"
                      />
                    )}
                    <span className="tabular-nums text-sm font-medium">
                      {(t.value * 100).toFixed(1)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(t)}
                    >
                      <Pencil />
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`threshold-${t.key}`} className="text-xs text-muted-foreground">
                      New value (%)
                    </Label>
                    <Input
                      id={`threshold-${t.key}`}
                      type="number"
                      step="0.1"
                      min={(t.min ?? 0) * 100}
                      max={(t.max ?? 1) * 100}
                      value={editing.value}
                      onChange={(e) =>
                        setEditing({ ...editing, value: e.target.value })
                      }
                      className="h-8 w-24 tabular-nums"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`reason-${t.key}`} className="text-xs text-muted-foreground">
                      Reason for change (required)
                    </Label>
                    <Input
                      id={`reason-${t.key}`}
                      placeholder="Why are you changing this threshold?"
                      value={editing.reason}
                      onChange={(e) =>
                        setEditing({ ...editing, reason: e.target.value })
                      }
                      className="mt-1 h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !editing.reason.trim()}
                    >
                      <Check />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                    >
                      <X />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Contextual guidance */}
        {guidance && guidance.length > 0 && (
          <div className="space-y-1 rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Guidance</p>
            {guidance.map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
            {testCaseCount !== undefined && (
              <p className="text-xs text-muted-foreground">
                Based on {testCaseCount} test case{testCaseCount !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/threshold-management.tsx
git commit -m "feat(eng): add ThresholdManagement reusable editing component"
```

---

### Task 7: Empty State Component

**Files:**
- Create: `src/components/eng/empty-state.tsx`

Consistent empty state pattern: icon + heading + description + optional action button. Used for: no providers, no test cases, no requests, capabilities not implemented, DDA placeholder, no chart data.

- [ ] **Step 1: Create EmptyState**

```tsx
// src/components/eng/empty-state.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Lucide icon component */
  icon: React.ElementType
  /** Primary heading */
  heading: string
  /** Description text */
  description: string
  /** Optional action button or element */
  action?: React.ReactNode
  /** Optional additional content below the description */
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  heading,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 rounded-xl bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium">{heading}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {children && <div className="mt-4">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/empty-state.tsx
git commit -m "feat(eng): add EmptyState consistent empty state component"
```

---

### Task 8: JSON Viewer Component

**Files:**
- Create: `src/components/eng/json-viewer.tsx`

Collapsible tree view with syntax highlighting. For raw API responses in Discovery, external data panels in test cases, and any raw-data inspection. No external library — a lightweight recursive renderer.

- [ ] **Step 1: Create JsonViewer**

```tsx
// src/components/eng/json-viewer.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface JsonViewerProps {
  /** JSON data to display */
  data: unknown
  /** Initial expansion depth (default 2) */
  defaultExpandDepth?: number
  /** Maximum string length before truncation (default 120) */
  maxStringLength?: number
  className?: string
}

interface NodeProps {
  label?: string
  value: unknown
  depth: number
  defaultExpandDepth: number
  maxStringLength: number
}

function JsonString({ value, maxLength }: { value: string; maxLength: number }) {
  const truncated = value.length > maxLength
  const display = truncated ? value.slice(0, maxLength) + '...' : value
  return (
    <span className="text-emerald-700 dark:text-emerald-400">
      &quot;{display}&quot;
      {truncated && (
        <span className="ml-1 text-xs text-muted-foreground">
          ({value.length} chars)
        </span>
      )}
    </span>
  )
}

function JsonNumber({ value }: { value: number }) {
  return <span className="text-sky-700 dark:text-sky-400">{value}</span>
}

function JsonBoolean({ value }: { value: boolean }) {
  return (
    <span className="text-amber-700 dark:text-amber-400">
      {value ? 'true' : 'false'}
    </span>
  )
}

function JsonNull() {
  return <span className="text-muted-foreground italic">null</span>
}

function JsonNode({
  label,
  value,
  depth,
  defaultExpandDepth,
  maxStringLength,
}: NodeProps) {
  const [expanded, setExpanded] = React.useState(depth < defaultExpandDepth)

  if (value === null || value === undefined) {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        {label && <span className="text-foreground">{label}: </span>}
        <JsonNull />
      </div>
    )
  }

  if (typeof value === 'string') {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        {label && <span className="text-foreground">{label}: </span>}
        <JsonString value={value} maxLength={maxStringLength} />
      </div>
    )
  }

  if (typeof value === 'number') {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        {label && <span className="text-foreground">{label}: </span>}
        <JsonNumber value={value} />
      </div>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        {label && <span className="text-foreground">{label}: </span>}
        <JsonBoolean value={value} />
      </div>
    )
  }

  const isArray = Array.isArray(value)
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>)
  const bracket = isArray ? ['[', ']'] : ['{', '}']
  const count = entries.length

  if (count === 0) {
    return (
      <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
        {label && <span className="text-foreground">{label}: </span>}
        <span className="text-muted-foreground">
          {bracket[0]}{bracket[1]}
        </span>
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        className="flex items-center gap-0.5 hover:bg-muted/50 rounded px-0.5 -ml-0.5"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight
          className={cn(
            'size-3 text-muted-foreground transition-transform',
            expanded && 'rotate-90',
          )}
        />
        {label && <span className="text-foreground">{label}: </span>}
        {!expanded && (
          <span className="text-muted-foreground">
            {bracket[0]} {count} item{count !== 1 ? 's' : ''} {bracket[1]}
          </span>
        )}
        {expanded && (
          <span className="text-muted-foreground">{bracket[0]}</span>
        )}
      </button>
      {expanded && (
        <>
          {entries.map(([key, v]) => (
            <JsonNode
              key={key}
              label={isArray ? undefined : key}
              value={v}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
              maxStringLength={maxStringLength}
            />
          ))}
          <div style={{ paddingLeft: 0 }}>
            <span className="text-muted-foreground">{bracket[1]}</span>
          </div>
        </>
      )}
    </div>
  )
}

export function JsonViewer({
  data,
  defaultExpandDepth = 2,
  maxStringLength = 120,
  className,
}: JsonViewerProps) {
  return (
    <div
      className={cn(
        'overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed',
        className,
      )}
    >
      <JsonNode
        value={data}
        depth={0}
        defaultExpandDepth={defaultExpandDepth}
        maxStringLength={maxStringLength}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/json-viewer.tsx
git commit -m "feat(eng): add JsonViewer collapsible tree component"
```

---

### Task 9: Bill PDF Viewer Component (Shared)

**Files:**
- Create: `src/components/bill-pdf-viewer.tsx`

Shared PDF viewer using an iframe-based approach. Renders PDF inline from a Supabase storage URL. Accepts a `storagePath` or direct `url`. Optional `highlights` prop type-stubbed for future bounding box overlay (not implemented in Plan 3). Lives in `src/components/` because it will be used in the user-facing app later.

- [ ] **Step 1: Create BillPdfViewer**

```tsx
// src/components/bill-pdf-viewer.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { FileText, Loader2 } from 'lucide-react'

/**
 * Bounding box highlight for future field-level overlay.
 * Not implemented in Plan 3 — type is defined now for interface stability.
 */
export interface PdfHighlight {
  /** Field name for labeling */
  field: string
  /** Bounding box coordinates (0-1 normalized to page dimensions) */
  x: number
  y: number
  width: number
  height: number
  /** Page number (1-indexed) */
  page: number
  /** Optional color override */
  color?: string
}

interface BillPdfViewerProps {
  /** Direct URL to the PDF (takes precedence over storagePath) */
  url?: string
  /** Supabase storage path — caller is responsible for generating a signed URL */
  storagePath?: string
  /** Function to resolve a storagePath to a URL (provided by parent) */
  resolveUrl?: (path: string) => Promise<string>
  /** Future: bounding box highlights (not rendered in Plan 3) */
  highlights?: PdfHighlight[]
  /** Height of the viewer (default "100%") */
  height?: string | number
  className?: string
}

export function BillPdfViewer({
  url: directUrl,
  storagePath,
  resolveUrl,
  // highlights is accepted but not used in Plan 3
  height = '100%',
  className,
}: BillPdfViewerProps) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(directUrl ?? null)
  const [loading, setLoading] = React.useState(!directUrl && !!storagePath)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (directUrl) {
      setPdfUrl(directUrl)
      setLoading(false)
      return
    }

    if (!storagePath || !resolveUrl) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    resolveUrl(storagePath)
      .then((url) => {
        if (!cancelled) {
          setPdfUrl(url)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [directUrl, storagePath, resolveUrl])

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border bg-muted/30',
          className,
        )}
        style={{ height }}
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !pdfUrl) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30',
          className,
        )}
        style={{ height }}
      >
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {error ?? 'No PDF available'}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border', className)} style={{ height }}>
      <iframe
        src={pdfUrl}
        className="h-full w-full"
        title="Bill PDF"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bill-pdf-viewer.tsx
git commit -m "feat: add BillPdfViewer shared PDF viewer component"
```

---

### Task 10: SourceDataPanel — Test Case View Primitive

**Files:**
- Create: `src/components/eng/source-data-panel.tsx`

Renders the primary source data for a test case. Accepts either a PDF (renders BillPdfViewer) or structured data (renders formatted key-value fields). Used by all competencies for the "what are we testing against?" column. Also used in fix request detail pages.

- [ ] **Step 1: Create SourceDataPanel**

```tsx
// src/components/eng/source-data-panel.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BillPdfViewer } from '@/components/bill-pdf-viewer'
import { JsonViewer } from '@/components/eng/json-viewer'
import { cn } from '@/lib/utils'

interface SourceDataPanelPdfProps {
  type: 'pdf'
  /** Direct URL to the PDF */
  url?: string
  /** Supabase storage path */
  storagePath?: string
  /** URL resolver for storage paths */
  resolveUrl?: (path: string) => Promise<string>
  /** File name for display */
  fileName?: string
}

interface SourceDataPanelDataProps {
  type: 'data'
  /** Structured data to display (JSONB from source_data column) */
  data: Record<string, unknown>
  /** Optional label for the data (e.g., "Extraction result", "Bill summary") */
  dataLabel?: string
}

type SourceDataPanelProps = (SourceDataPanelPdfProps | SourceDataPanelDataProps) & {
  title?: string
  className?: string
}

export function SourceDataPanel(props: SourceDataPanelProps) {
  const { title = 'Source Data', className } = props

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader className="border-b">
        <CardTitle className="text-sm">
          {title}
          {props.type === 'pdf' && props.fileName && (
            <span className="ml-2 font-normal text-muted-foreground">
              {props.fileName}
            </span>
          )}
          {props.type === 'data' && props.dataLabel && (
            <span className="ml-2 font-normal text-muted-foreground">
              {props.dataLabel}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {props.type === 'pdf' ? (
          <BillPdfViewer
            url={props.url}
            storagePath={props.storagePath}
            resolveUrl={props.resolveUrl}
            height="100%"
            className="rounded-none border-0"
          />
        ) : (
          <div className="p-4">
            <JsonViewer data={props.data} defaultExpandDepth={3} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/source-data-panel.tsx
git commit -m "feat(eng): add SourceDataPanel test case view primitive"
```

---

### Task 11: ExternalDataPanel — Test Case View Primitive

**Files:**
- Create: `src/components/eng/external-data-panel.tsx`

Renders raw external data with a metadata header (source type badge, URL if applicable, response status, timestamp). Body renders in JSON viewer. Used by validation, payment matching, and invoice discovery competencies. Also used in fix request detail pages.

- [ ] **Step 1: Create ExternalDataPanel**

```tsx
// src/components/eng/external-data-panel.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { JsonViewer } from '@/components/eng/json-viewer'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export interface ExternalDataMeta {
  /** Source type: "api", "web-scrape", "barcode", etc. */
  sourceType: string
  /** URL if applicable (API endpoint, scraped page) */
  url?: string
  /** HTTP response status code */
  responseStatus?: number
  /** When the external data was fetched */
  timestamp?: string
}

interface ExternalDataPanelProps {
  /** Metadata about the external data source */
  meta: ExternalDataMeta
  /** The raw external response data */
  data: unknown
  title?: string
  className?: string
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return 'bg-success/10 text-emerald-700 dark:text-emerald-400'
  if (status >= 400 && status < 500) return 'bg-warning/10 text-amber-700 dark:text-amber-400'
  return 'bg-destructive/10 text-destructive'
}

export function ExternalDataPanel({
  meta,
  data,
  title = 'External Data',
  className,
}: ExternalDataPanelProps) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader className="border-b">
        <CardTitle className="text-sm">{title}</CardTitle>
        {/* Metadata bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary" className="text-xs">
            {meta.sourceType}
          </Badge>
          {meta.responseStatus !== undefined && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                statusColor(meta.responseStatus),
              )}
            >
              {meta.responseStatus}
            </span>
          )}
          {meta.url && (
            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              <span className="max-w-[200px] truncate">{meta.url}</span>
            </a>
          )}
          {meta.timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(meta.timestamp)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4">
        <JsonViewer data={data} defaultExpandDepth={2} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/external-data-panel.tsx
git commit -m "feat(eng): add ExternalDataPanel test case view primitive"
```

---

### Task 12: ExpectedResultsPanel — Test Case View Primitive

**Files:**
- Create: `src/components/eng/expected-results-panel.tsx`

Renders expected vs. actual results with per-field pass/fail indicators. Shows diffs when actual doesn't match expected. Used by all competencies for the "what should the result be?" column. Also used in fix request detail pages.

- [ ] **Step 1: Create ExpectedResultsPanel**

```tsx
// src/components/eng/expected-results-panel.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Check, X, Minus } from 'lucide-react'

export interface FieldResult {
  /** Dot-notation field name (e.g., "billing.amountDue") */
  field: string
  /** Expected value */
  expected: string | number | boolean | null
  /** Actual value from the pipeline (undefined if not present in result) */
  actual?: string | number | boolean | null
  /** Whether this field passed */
  passed: boolean
}

interface ExpectedResultsPanelProps {
  /** Per-field results */
  fields: FieldResult[]
  /** Overall pass/fail for the test case */
  overallPassed?: boolean
  /** Summary stats */
  summary?: {
    total: number
    passed: number
    failed: number
  }
  title?: string
  className?: string
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  return value
}

function FieldRow({ field }: { field: FieldResult }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md px-2 py-1.5 text-sm',
        !field.passed && 'bg-destructive/5',
      )}
    >
      {/* Pass/fail icon */}
      <div className="mt-0.5 shrink-0">
        {field.passed ? (
          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : field.actual === undefined ? (
          <Minus className="size-3.5 text-muted-foreground" />
        ) : (
          <X className="size-3.5 text-destructive" />
        )}
      </div>

      {/* Field name */}
      <span className="min-w-[140px] shrink-0 font-mono text-xs text-muted-foreground">
        {field.field}
      </span>

      {/* Values */}
      <div className="flex-1 space-y-0.5">
        {field.passed ? (
          <span className="font-mono text-xs">{formatValue(field.expected)}</span>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">expected:</span>
              <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                {formatValue(field.expected)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">actual:</span>
              <span className="font-mono text-xs text-destructive">
                {formatValue(field.actual)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function ExpectedResultsPanel({
  fields,
  overallPassed,
  summary,
  title = 'Expected Results',
  className,
}: ExpectedResultsPanelProps) {
  const computedSummary = summary ?? {
    total: fields.length,
    passed: fields.filter((f) => f.passed).length,
    failed: fields.filter((f) => !f.passed).length,
  }

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            {overallPassed !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                  overallPassed
                    ? 'bg-success/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                {overallPassed ? (
                  <>
                    <Check className="size-3" /> Passed
                  </>
                ) : (
                  <>
                    <X className="size-3" /> Failed
                  </>
                )}
              </span>
            )}
            <span className="tabular-nums text-muted-foreground">
              {computedSummary.passed}/{computedSummary.total} fields
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-2">
        <div className="space-y-0.5">
          {/* Show failing fields first */}
          {fields
            .slice()
            .sort((a, b) => {
              if (a.passed === b.passed) return 0
              return a.passed ? 1 : -1
            })
            .map((field) => (
              <FieldRow key={field.field} field={field} />
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/expected-results-panel.tsx
git commit -m "feat(eng): add ExpectedResultsPanel test case view primitive"
```

---

### Task 13: TestCaseLayout — Multi-Panel Layout Component

**Files:**
- Create: `src/components/eng/test-case-layout.tsx`

Responsive multi-panel layout that composes SourceDataPanel, ExternalDataPanel, and ExpectedResultsPanel. Accepts 2 panels (source + expected) or 3 panels (source + external + expected) based on competency. Handles scrolling and sizing. Desktop only — no mobile breakpoints needed.

- [ ] **Step 1: Create TestCaseLayout**

```tsx
// src/components/eng/test-case-layout.tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

interface TestCaseLayoutTwoPanelProps {
  /** Number of panels */
  panels: 2
  /** Left panel (source data) */
  left: React.ReactNode
  /** Right panel (expected results) */
  right: React.ReactNode
}

interface TestCaseLayoutThreePanelProps {
  /** Number of panels */
  panels: 3
  /** Left panel (source data) */
  left: React.ReactNode
  /** Center panel (external data) */
  center: React.ReactNode
  /** Right panel (expected results) */
  right: React.ReactNode
}

type TestCaseLayoutProps = (TestCaseLayoutTwoPanelProps | TestCaseLayoutThreePanelProps) & {
  /** Height of the layout (default "calc(100vh - 200px)") */
  height?: string
  className?: string
}

export function TestCaseLayout(props: TestCaseLayoutProps) {
  const { height = 'calc(100vh - 200px)', className } = props

  if (props.panels === 2) {
    return (
      <div
        className={cn('grid grid-cols-2 gap-4', className)}
        style={{ height }}
      >
        <div className="overflow-hidden">{props.left}</div>
        <div className="overflow-hidden">{props.right}</div>
      </div>
    )
  }

  return (
    <div
      className={cn('grid grid-cols-3 gap-4', className)}
      style={{ height }}
    >
      <div className="overflow-hidden">{props.left}</div>
      <div className="overflow-hidden">{props.center}</div>
      <div className="overflow-hidden">{props.right}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/test-case-layout.tsx
git commit -m "feat(eng): add TestCaseLayout multi-panel layout component"
```

---

### Task 14: Barrel Export for Eng Components

**Files:**
- Create: `src/components/eng/index.ts`

Single import point for all eng components. Not required but makes imports cleaner for downstream page implementations.

- [ ] **Step 1: Create barrel export**

```typescript
// src/components/eng/index.ts

// Threshold system
export { ThresholdBadge } from './threshold-badge'
export { ThresholdText } from './threshold-text'
export { ThresholdManagement } from './threshold-management'
export type { ThresholdConfig } from './threshold-management'

// Charts
export { Sparkline } from './sparkline'
export type { SparklineDataPoint } from './sparkline'
export { TrendChart } from './trend-chart'
export type { TrendDataPoint } from './trend-chart'

// Test case view primitives
export { TestCaseLayout } from './test-case-layout'
export { SourceDataPanel } from './source-data-panel'
export { ExternalDataPanel } from './external-data-panel'
export type { ExternalDataMeta } from './external-data-panel'
export { ExpectedResultsPanel } from './expected-results-panel'
export type { FieldResult } from './expected-results-panel'

// Shared UI
export { EmptyState } from './empty-state'
export { JsonViewer } from './json-viewer'
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/index.ts
git commit -m "feat(eng): add barrel export for all eng shared components"
```

---

## Summary

| Task | Component | File | Est. time |
|------|-----------|------|-----------|
| 1 | Threshold utility | `src/lib/eng/threshold.ts` | 2 min |
| 2 | ThresholdBadge | `src/components/eng/threshold-badge.tsx` | 2 min |
| 3 | ThresholdText | `src/components/eng/threshold-text.tsx` | 2 min |
| 4 | Sparkline | `src/components/eng/sparkline.tsx` | 3 min |
| 5 | TrendChart | `src/components/eng/trend-chart.tsx` | 5 min |
| 6 | ThresholdManagement | `src/components/eng/threshold-management.tsx` | 4 min |
| 7 | EmptyState | `src/components/eng/empty-state.tsx` | 2 min |
| 8 | JsonViewer | `src/components/eng/json-viewer.tsx` | 4 min |
| 9 | BillPdfViewer (shared) | `src/components/bill-pdf-viewer.tsx` | 3 min |
| 10 | SourceDataPanel | `src/components/eng/source-data-panel.tsx` | 3 min |
| 11 | ExternalDataPanel | `src/components/eng/external-data-panel.tsx` | 3 min |
| 12 | ExpectedResultsPanel | `src/components/eng/expected-results-panel.tsx` | 4 min |
| 13 | TestCaseLayout | `src/components/eng/test-case-layout.tsx` | 2 min |
| 14 | Barrel export | `src/components/eng/index.ts` | 1 min |
| **Total** | | | **~40 min** |

### Dependencies Between Tasks

- Task 1 (threshold utility) must be done first — Tasks 2, 3, 4, 5, 6 depend on it
- Tasks 2 and 3 (ThresholdBadge, ThresholdText) must precede Task 6 (ThresholdManagement uses ThresholdText)
- Task 8 (JsonViewer) must precede Tasks 10 and 11 (SourceDataPanel and ExternalDataPanel use it)
- Task 9 (BillPdfViewer) must precede Task 10 (SourceDataPanel uses it)
- Tasks 10, 11, 12 (view primitives) must precede Task 13 (TestCaseLayout composes them)
- Task 14 (barrel export) is last

### Parallel Execution Groups

- **Group A** (sequential): Task 1 → Tasks 2, 3 (parallel) → Task 6
- **Group B** (sequential): Task 8 → Task 9 → Task 10
- **Group C** (independent): Task 4, Task 5, Task 7, Task 11, Task 12
- **Final**: Task 13, then Task 14

Groups A, B, and C can run in parallel where they don't share dependencies.
