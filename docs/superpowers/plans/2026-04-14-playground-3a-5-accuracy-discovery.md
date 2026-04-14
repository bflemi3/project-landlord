# Playground UI — Plan 3a-5: Accuracy Dashboard & Discovery

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the accuracy dashboard (system health, provider table, threshold management) and discovery section (bank accounts via Pluggy, DDA placeholder).

**Architecture:** Server-rendered pages under `/eng/accuracy` and `/eng/discovery`. Uses the eng Supabase client for data. Shared components from Plan 3a-2 (ThresholdManagement, TrendChart, Sparkline, ThresholdBadge, EmptyState, JsonViewer). Pluggy integration reuses existing `src/lib/pluggy/` client and connect token route.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Recharts, Pluggy SDK

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plans 3a-1 (database), 3a-2 (shared components)
**Blocks:** Plan 3a-6 (code review)

---

## File Structure

```
src/app/eng/
  accuracy/
    page.tsx                                          # Accuracy dashboard
  discovery/
    layout.tsx                                        # Discovery tabs layout
    page.tsx                                          # Redirect to bank-accounts
    bank-accounts/
      page.tsx                                        # Bank account explorer
    boleto-dda/
      page.tsx                                        # DDA placeholder

src/components/eng/
  accuracy-provider-table.tsx                         # Provider accuracy table
  system-health-summary.tsx                           # System health stats bar
  bank-account-explorer.tsx                           # Pluggy account + transaction browser
  discovery-tabs.tsx                                  # Tab navigation for discovery

src/lib/hooks/eng/
  use-accuracy-dashboard.ts                           # Hook: accuracy data across all providers
  use-system-thresholds.ts                            # Hook: system threshold CRUD
  use-bank-accounts.ts                                # Hook: Pluggy accounts + transactions
```

---

### Task 1: System Thresholds Hook

**Files:**
- Create: `src/lib/hooks/eng/use-system-thresholds.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/hooks/eng/use-system-thresholds.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'

export interface SystemThresholds {
  minAccuracy: number
  autoAccept: number
  review: number
}

export function useSystemThresholds() {
  const [thresholds, setThresholds] = useState<SystemThresholds>({
    minAccuracy: 0.95,
    autoAccept: 0.90,
    review: 0.50,
  })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createEngBrowserClient()
    const { data } = await supabase.from('system_thresholds').select('key, value')
    if (data) {
      const map = Object.fromEntries(data.map((d) => [d.key, Number(d.value)]))
      setThresholds({
        minAccuracy: map.min_accuracy ?? 0.95,
        autoAccept: map.auto_accept ?? 0.90,
        review: map.review ?? 0.50,
      })
    }
    setLoading(false)
  }, [])

  const update = useCallback(async (key: string, value: number, reason: string) => {
    const supabase = createEngBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get old value
    const { data: old } = await supabase
      .from('system_thresholds')
      .select('value')
      .eq('key', key)
      .single()

    // Update
    await supabase
      .from('system_thresholds')
      .update({ value })
      .eq('key', key)

    // Audit log
    if (user) {
      await supabase.from('audit_log').insert({
        entity_type: 'system_threshold',
        entity_id: key,
        action: 'threshold_updated',
        old_value: { value: old?.value },
        new_value: { value, reason },
        changed_by: user.id,
      })
    }

    await fetch()
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])

  return { thresholds, loading, update, refetch: fetch }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/eng/use-system-thresholds.ts
git commit -m "feat(eng): add system thresholds hook"
```

---

### Task 2: Accuracy Dashboard Hook

**Files:**
- Create: `src/lib/hooks/eng/use-accuracy-dashboard.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/hooks/eng/use-accuracy-dashboard.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'

export interface AccuracyProviderRow {
  id: string
  name: string
  displayName: string | null
  categories: string[]
  activeProfileCount: number
  totalProfileCount: number
  weightedAccuracy: number | null
  lastTested: string | null
  openFixCount: number
}

export interface AccuracySystemHealth {
  overallAccuracy: number | null
  activeProfiles: number
  totalProfiles: number
  totalTestCases: number
  openFixRequests: number
}

export function useAccuracyDashboard() {
  const [providers, setProviders] = useState<AccuracyProviderRow[]>([])
  const [health, setHealth] = useState<AccuracySystemHealth>({
    overallAccuracy: null,
    activeProfiles: 0,
    totalProfiles: 0,
    totalTestCases: 0,
    openFixRequests: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createEngBrowserClient()

    const { data: providerData } = await supabase
      .from('providers')
      .select(`
        id, name, display_name,
        provider_invoice_profiles (
          id, category, status,
          test_cases (id),
          test_runs (accuracy, passed, created_at),
          test_fix_requests (id, status)
        )
      `)
      .order('name')

    if (!providerData) {
      setLoading(false)
      return
    }

    let totalActive = 0
    let totalProfiles = 0
    let totalTestCases = 0
    let totalOpenFixes = 0
    let systemWeightedSum = 0
    let systemTotalWeight = 0

    const rows: AccuracyProviderRow[] = providerData.map((p) => {
      const profiles = p.provider_invoice_profiles ?? []
      const categories = [...new Set(profiles.map((pr: any) => pr.category).filter(Boolean))]
      const active = profiles.filter((pr: any) => pr.status === 'active')

      totalActive += active.length
      totalProfiles += profiles.length

      let provWeighted = 0
      let provWeight = 0
      let lastTested: string | null = null
      let fixCount = 0

      for (const profile of profiles) {
        const cases = (profile as any).test_cases ?? []
        const runs = (profile as any).test_runs ?? []
        const fixes = ((profile as any).test_fix_requests ?? []).filter((f: any) => f.status === 'open')

        totalTestCases += cases.length
        fixCount += fixes.length
        totalOpenFixes += fixes.length

        if (runs.length > 0) {
          const latest = runs.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          const weight = cases.length || 1
          provWeighted += (latest.accuracy ?? 0) * weight
          provWeight += weight
          systemWeightedSum += (latest.accuracy ?? 0) * weight
          systemTotalWeight += weight
          if (!lastTested || new Date(latest.created_at) > new Date(lastTested)) {
            lastTested = latest.created_at
          }
        }
      }

      return {
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        categories,
        activeProfileCount: active.length,
        totalProfileCount: profiles.length,
        weightedAccuracy: provWeight > 0 ? provWeighted / provWeight : null,
        lastTested,
        openFixCount: fixCount,
      }
    })

    // Sort: failing first, then near-threshold, then healthy
    rows.sort((a, b) => {
      const aScore = a.weightedAccuracy === null ? 1 : a.weightedAccuracy < 0.95 ? 0 : 2
      const bScore = b.weightedAccuracy === null ? 1 : b.weightedAccuracy < 0.95 ? 0 : 2
      if (aScore !== bScore) return aScore - bScore
      return (a.weightedAccuracy ?? 0) - (b.weightedAccuracy ?? 0)
    })

    setProviders(rows)
    setHealth({
      overallAccuracy: systemTotalWeight > 0 ? systemWeightedSum / systemTotalWeight : null,
      activeProfiles: totalActive,
      totalProfiles,
      totalTestCases,
      openFixRequests: totalOpenFixes,
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { providers, health, loading, refetch: fetch }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/eng/use-accuracy-dashboard.ts
git commit -m "feat(eng): add accuracy dashboard data hook"
```

---

### Task 3: System Health Summary Component

**Files:**
- Create: `src/components/eng/system-health-summary.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/eng/system-health-summary.tsx
'use client'

import { Card } from '@/components/ui/card'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import type { AccuracySystemHealth } from '@/lib/hooks/eng/use-accuracy-dashboard'
import Link from 'next/link'

interface Props {
  health: AccuracySystemHealth
  systemMinAccuracy: number
}

export function SystemHealthSummary({ health, systemMinAccuracy }: Props) {
  return (
    <div className="grid grid-cols-5 gap-4">
      <Card className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Overall Accuracy</div>
        {health.overallAccuracy !== null ? (
          <ThresholdBadge value={health.overallAccuracy} threshold={systemMinAccuracy} format="percent" />
        ) : (
          <div className="text-2xl font-semibold text-muted-foreground">—</div>
        )}
      </Card>

      <Card className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Active Profiles</div>
        <div className="text-2xl font-semibold">
          {health.activeProfiles} <span className="text-sm text-muted-foreground">/ {health.totalProfiles}</span>
        </div>
      </Card>

      <Card className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Total Test Cases</div>
        <div className="text-2xl font-semibold">{health.totalTestCases}</div>
      </Card>

      <Card className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Open Fix Requests</div>
        <Link href="/eng/fixes" className="block">
          <div className={`text-2xl font-semibold ${health.openFixRequests > 0 ? 'text-amber-600' : ''}`}>
            {health.openFixRequests}
          </div>
        </Link>
      </Card>

      <Card className="p-4 space-y-1">
        <div className="text-xs text-muted-foreground font-medium">System Status</div>
        <div className={`text-lg font-semibold ${
          health.overallAccuracy === null ? 'text-muted-foreground'
          : health.overallAccuracy >= systemMinAccuracy ? 'text-emerald-600'
          : 'text-rose-600'
        }`}>
          {health.overallAccuracy === null ? 'No data'
           : health.overallAccuracy >= systemMinAccuracy ? 'Healthy'
           : 'Needs attention'}
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/system-health-summary.tsx
git commit -m "feat(eng): add system health summary component"
```

---

### Task 4: Accuracy Provider Table Component

**Files:**
- Create: `src/components/eng/accuracy-provider-table.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/eng/accuracy-provider-table.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import { Sparkline } from '@/components/eng/sparkline'
import type { AccuracyProviderRow } from '@/lib/hooks/eng/use-accuracy-dashboard'

interface Props {
  providers: AccuracyProviderRow[]
  systemMinAccuracy: number
}

export function AccuracyProviderTable({ providers, systemMinAccuracy }: Props) {
  const router = useRouter()

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-2 font-medium">Provider</th>
          <th className="pb-2 font-medium">Categories</th>
          <th className="pb-2 font-medium">Active Profiles</th>
          <th className="pb-2 font-medium">Accuracy</th>
          <th className="pb-2 font-medium">Last Tested</th>
        </tr>
      </thead>
      <tbody>
        {providers.map((p) => (
          <tr
            key={p.id}
            className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push(`/eng/providers/${p.id}`)}
          >
            <td className="py-3 font-medium">{p.displayName ?? p.name}</td>
            <td className="py-3">
              <div className="flex gap-1 flex-wrap">
                {p.categories.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                ))}
              </div>
            </td>
            <td className="py-3">{p.activeProfileCount}</td>
            <td className="py-3">
              {p.weightedAccuracy !== null ? (
                <div className="flex items-center gap-2">
                  <ThresholdBadge value={p.weightedAccuracy} threshold={systemMinAccuracy} format="percent" />
                  <Sparkline data={[]} threshold={systemMinAccuracy} />
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className="py-3 text-muted-foreground">
              {p.lastTested ? new Date(p.lastTested).toLocaleDateString() : '—'}
            </td>
          </tr>
        ))}
        {providers.length === 0 && (
          <tr>
            <td colSpan={5} className="py-8 text-center text-muted-foreground">
              No providers found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/accuracy-provider-table.tsx
git commit -m "feat(eng): add accuracy provider table component"
```

---

### Task 5: Accuracy Dashboard Page

**Files:**
- Create: `src/app/eng/accuracy/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/eng/accuracy/page.tsx
'use client'

import { Card } from '@/components/ui/card'
import { TrendChart } from '@/components/eng/trend-chart'
import { ThresholdManagement } from '@/components/eng/threshold-management'
import { SystemHealthSummary } from '@/components/eng/system-health-summary'
import { AccuracyProviderTable } from '@/components/eng/accuracy-provider-table'
import { useAccuracyDashboard } from '@/lib/hooks/eng/use-accuracy-dashboard'
import { useSystemThresholds } from '@/lib/hooks/eng/use-system-thresholds'

export default function AccuracyPage() {
  const { providers, health, loading } = useAccuracyDashboard()
  const { thresholds, update: updateThreshold } = useSystemThresholds()

  if (loading) return <div className="p-6 text-muted-foreground">Loading accuracy data...</div>

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Accuracy Dashboard</h1>

      {/* Tier 1: System Health */}
      <SystemHealthSummary
        health={health}
        systemMinAccuracy={thresholds.minAccuracy}
      />

      {/* System Accuracy Trend */}
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">System Accuracy Over Time</h2>
        <TrendChart
          data={[]}
          threshold={thresholds.minAccuracy}
          annotations={[]}
        />
      </Card>

      {/* Tier 2: Provider Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Providers</h2>
        <AccuracyProviderTable
          providers={providers}
          systemMinAccuracy={thresholds.minAccuracy}
        />
      </div>

      {/* System Threshold Management */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium">System Default Thresholds</h2>
        <p className="text-sm text-muted-foreground">
          These defaults are inherited by new profiles. Individual profiles can override on their overview tab.
        </p>
        <ThresholdManagement
          profileId="system"
          minAccuracy={thresholds.minAccuracy}
          autoAcceptThreshold={thresholds.autoAccept}
          reviewThreshold={thresholds.review}
          currentAccuracy={health.overallAccuracy}
          testCaseCount={health.totalTestCases}
          onSave={async (values, reason) => {
            if (values.minAccuracy !== undefined) await updateThreshold('min_accuracy', values.minAccuracy, reason)
            if (values.autoAcceptThreshold !== undefined) await updateThreshold('auto_accept', values.autoAcceptThreshold, reason)
            if (values.reviewThreshold !== undefined) await updateThreshold('review', values.reviewThreshold, reason)
          }}
        />
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/eng/accuracy/page.tsx
git commit -m "feat(eng): add accuracy dashboard page"
```

---

### Task 6: Discovery Layout and Tabs

**Files:**
- Create: `src/components/eng/discovery-tabs.tsx`
- Create: `src/app/eng/discovery/layout.tsx`
- Create: `src/app/eng/discovery/page.tsx`

- [ ] **Step 1: Create discovery tabs**

```typescript
// src/components/eng/discovery-tabs.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Bank Accounts', segment: 'bank-accounts' },
  { label: 'Boleto DDA', segment: 'boleto-dda' },
]

export function DiscoveryTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b">
      <nav className="flex gap-6 px-6">
        {tabs.map((tab) => {
          const href = `/eng/discovery/${tab.segment}`
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={tab.segment}
              href={href}
              className={`border-b-2 pb-3 pt-4 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Create layout and redirect**

```typescript
// src/app/eng/discovery/layout.tsx
import { DiscoveryTabs } from '@/components/eng/discovery-tabs'

export default function DiscoveryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="px-6 pt-6 pb-0">
        <h1 className="text-2xl font-semibold mb-4">Discovery</h1>
      </div>
      <DiscoveryTabs />
      <div className="p-6">{children}</div>
    </div>
  )
}
```

```typescript
// src/app/eng/discovery/page.tsx
import { redirect } from 'next/navigation'

export default function DiscoveryPage() {
  redirect('/eng/discovery/bank-accounts')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/discovery-tabs.tsx src/app/eng/discovery/layout.tsx src/app/eng/discovery/page.tsx
git commit -m "feat(eng): add discovery layout with tabs"
```

---

### Task 7: Bank Accounts Page

**Files:**
- Create: `src/lib/hooks/eng/use-bank-accounts.ts`
- Create: `src/components/eng/bank-account-explorer.tsx`
- Create: `src/app/eng/discovery/bank-accounts/page.tsx`

- [ ] **Step 1: Create bank accounts hook**

```typescript
// src/lib/hooks/eng/use-bank-accounts.ts
'use client'

import { useState, useCallback } from 'react'

export interface ConnectedAccount {
  id: string
  bankName: string
  accountType: string
  lastSynced: string | null
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: string
  raw: Record<string, any>
}

export function useBankAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pluggy/accounts')
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts ?? [])
      }
    } catch { /* Pluggy may not be configured */ }
    setLoading(false)
  }, [])

  const fetchTransactions = useCallback(async (accountId: string) => {
    setLoading(true)
    setSelectedAccount(accountId)
    try {
      const res = await fetch(`/api/pluggy/accounts/${accountId}/transactions`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions ?? [])
      }
    } catch { /* */ }
    setLoading(false)
  }, [])

  return {
    accounts,
    transactions,
    selectedAccount,
    loading,
    fetchAccounts,
    fetchTransactions,
  }
}
```

- [ ] **Step 2: Create the bank account explorer component**

```typescript
// src/components/eng/bank-account-explorer.tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { JsonViewer } from '@/components/eng/json-viewer'
import { EmptyState } from '@/components/eng/empty-state'
import { useBankAccounts } from '@/lib/hooks/eng/use-bank-accounts'
import { Wallet, RefreshCw } from 'lucide-react'

export function BankAccountExplorer() {
  const {
    accounts,
    transactions,
    selectedAccount,
    loading,
    fetchAccounts,
    fetchTransactions,
  } = useBankAccounts()

  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const filteredTx = search
    ? transactions.filter((tx) =>
        tx.description.toLowerCase().includes(search.toLowerCase())
      )
    : transactions

  return (
    <div className="space-y-6">
      {/* Connector info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Connector: Pluggy</h3>
            <p className="text-sm text-muted-foreground">Bank account connectivity provider</p>
          </div>
          <Badge variant="outline">Active</Badge>
        </div>
      </Card>

      {/* Connected accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Connected Accounts</h3>
          <Button size="sm" variant="outline" onClick={fetchAccounts}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            heading="No accounts connected"
            description="Connect a bank account using the Pluggy widget to browse transactions."
            action={{ label: 'Connect Account', onClick: () => { /* Launch Pluggy widget */ } }}
          />
        ) : (
          <div className="grid gap-2">
            {accounts.map((acc) => (
              <Card
                key={acc.id}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedAccount === acc.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => fetchTransactions(acc.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{acc.bankName}</div>
                    <div className="text-xs text-muted-foreground">{acc.accountType}</div>
                  </div>
                  {acc.lastSynced && (
                    <span className="text-xs text-muted-foreground">
                      Last synced: {new Date(acc.lastSynced).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      {selectedAccount && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Transactions</h3>
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="grid grid-cols-[1fr_300px] gap-4">
            {/* Transaction list */}
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredTx.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 rounded cursor-pointer text-sm transition-colors ${
                    selectedTx?.id === tx.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="flex justify-between">
                    <span>{tx.description}</span>
                    <span className={tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      R$ {(tx.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(tx.date).toLocaleDateString()} · {tx.type}
                  </div>
                </div>
              ))}
              {filteredTx.length === 0 && (
                <div className="text-center text-muted-foreground py-4">No transactions found</div>
              )}
            </div>

            {/* Raw detail */}
            <Card className="p-3">
              <h4 className="text-sm font-medium mb-2">Raw Data</h4>
              {selectedTx ? (
                <JsonViewer data={selectedTx.raw} />
              ) : (
                <p className="text-sm text-muted-foreground">Select a transaction to view raw API response</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create the page**

```typescript
// src/app/eng/discovery/bank-accounts/page.tsx
import { BankAccountExplorer } from '@/components/eng/bank-account-explorer'

export default function BankAccountsPage() {
  return <BankAccountExplorer />
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/eng/use-bank-accounts.ts src/components/eng/bank-account-explorer.tsx src/app/eng/discovery/bank-accounts/page.tsx
git commit -m "feat(eng): add bank accounts discovery page with Pluggy explorer"
```

---

### Task 8: Boleto DDA Placeholder

**Files:**
- Create: `src/app/eng/discovery/boleto-dda/page.tsx`

- [ ] **Step 1: Create the placeholder page**

```typescript
// src/app/eng/discovery/boleto-dda/page.tsx
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/eng/empty-state'
import { FileSearch } from 'lucide-react'

export default function BoletoDdaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium">Invoice & Payment Discovery</h2>
        <Badge variant="secondary">Not yet available</Badge>
      </div>

      <EmptyState
        icon={FileSearch}
        heading="Boleto DDA Integration"
        description="Discover incoming boletos and payment status via DDA (Débito Direto Autorizado). Boletos registered to a CPF appear here before the user uploads them, enabling proactive billing."
      />

      <Card className="p-4 space-y-3">
        <h3 className="font-medium">Implementation Details</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Requires Celcoin integration:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Register a CPF for DDA monitoring</li>
            <li>Receive incoming boleto webhooks</li>
            <li>Match discovered boletos to known providers</li>
            <li>Create or update charge instances</li>
          </ul>
          <p className="pt-2">
            DDA provides both invoice discovery (new boletos) and payment status
            (whether a boleto has been paid). This section will support testing
            both capabilities once the Celcoin integration is available.
          </p>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/eng/discovery/boleto-dda/page.tsx
git commit -m "feat(eng): add boleto DDA placeholder page"
```

---

### Task 9: Verify All Pages Compile

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run dev server and check routes**

```bash
npm run dev
```

Visit:
- `/eng/accuracy` — should show dashboard with health summary, provider table, thresholds
- `/eng/discovery/bank-accounts` — should show bank account explorer
- `/eng/discovery/boleto-dda` — should show DDA placeholder

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(eng): resolve compilation issues in accuracy and discovery pages"
```
