# Playground UI — Plan 3a-3: Provider Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all provider-related pages including the eng layout with sidebar, provider registry, provider/profile creation, provider detail, and all profile tabs (overview, test cases, pipeline).

**Architecture:** Next.js App Router nested routes under `/eng/` with a shared sidebar layout. Server components for initial data fetching, client components for interactivity. Uses the eng Supabase client (from Plan 3a-1) for all data access. Shared components from Plan 3a-2 are imported from `@/components/eng/`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plans 3a-1 (database & infrastructure), 3a-2 (shared components)
**Blocks:** Plan 3a-6 (code review)

---

## File Structure

```
src/app/eng/
  layout.tsx                                          # Sidebar nav + eng context provider
  page.tsx                                            # Redirect to /eng/providers
  providers/
    page.tsx                                          # Provider registry
    new/
      page.tsx                                        # Create provider form
    [providerId]/
      page.tsx                                        # Provider detail
      new-profile/
        page.tsx                                      # Create profile form
      [profileId]/
        layout.tsx                                    # Profile tabs layout
        overview/
          page.tsx                                    # Profile overview tab
        test-cases/
          page.tsx                                    # Test cases list + run tests
          [caseId]/
            page.tsx                                  # Individual test case detail
        pipeline/
          page.tsx                                    # Ad-hoc pipeline testing

src/components/eng/
  sidebar.tsx                                         # Sidebar navigation
  eng-provider.tsx                                    # React context for eng user + sidebar badges
  provider-registry-table.tsx                         # Client component: provider list table
  provider-form.tsx                                   # Client component: create/edit provider
  profile-form.tsx                                    # Client component: create profile
  profile-tabs.tsx                                    # Tab navigation for profile detail
  test-case-list.tsx                                  # Client component: test cases table
  test-case-create.tsx                                # Client component: test case creation flow
  pipeline-section.tsx                                # Client component: one pipeline section
  flag-for-fix-modal.tsx                              # Modal: create fix request from failure

src/lib/hooks/eng/
  use-providers.ts                                    # Hook: list providers with accuracy
  use-provider-detail.ts                              # Hook: single provider with profiles
  use-profile-detail.ts                               # Hook: single profile with test data
  use-test-cases.ts                                   # Hook: test cases for a profile
  use-test-case-detail.ts                             # Hook: single test case with results
  use-profile-mutations.ts                            # Hook: create/update profiles, run tests
  use-provider-mutations.ts                           # Hook: create/update providers

src/app/api/eng/
  providers/
    route.ts                                          # POST create provider
  providers/[providerId]/
    route.ts                                          # PATCH update provider
  profiles/
    route.ts                                          # POST create profile
  profiles/[profileId]/
    route.ts                                          # PATCH update profile
  profiles/[profileId]/run-tests/
    route.ts                                          # POST run test suite
  profiles/[profileId]/test-cases/
    route.ts                                          # POST create test case
  profiles/[profileId]/test-cases/[caseId]/
    route.ts                                          # PATCH/DELETE test case
  fix-requests/
    route.ts                                          # POST create fix request
```

---

### Task 1: Eng Context Provider

**Files:**
- Create: `src/components/eng/eng-provider.tsx`

The context provides the current engineer's user info and sidebar badge counts to all eng pages.

- [ ] **Step 1: Create the eng context provider**

```typescript
// src/components/eng/eng-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EngContextValue {
  userId: string
  email: string
  pendingRequestsCount: number
  openFixesCount: number
  failingProfilesCount: number
  refreshBadges: () => Promise<void>
}

const EngContext = createContext<EngContextValue | null>(null)

export function useEngContext(): EngContextValue {
  const ctx = useContext(EngContext)
  if (!ctx) throw new Error('useEngContext must be used within EngProvider')
  return ctx
}

export function EngProvider({
  children,
  userId,
  email,
}: {
  children: ReactNode
  userId: string
  email: string
}) {
  const [pendingRequestsCount, setPendingRequests] = useState(0)
  const [openFixesCount, setOpenFixes] = useState(0)
  const [failingProfilesCount, setFailingProfiles] = useState(0)

  const refreshBadges = async () => {
    const supabase = createClient()

    const [reqRes, fixRes, failRes] = await Promise.all([
      supabase
        .from('provider_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('test_fix_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabase.rpc('count_failing_profiles'),
    ])

    setPendingRequests(reqRes.count ?? 0)
    setOpenFixes(fixRes.count ?? 0)
    setFailingProfiles(typeof failRes.data === 'number' ? failRes.data : 0)
  }

  useEffect(() => {
    refreshBadges()
  }, [])

  return (
    <EngContext.Provider
      value={{
        userId,
        email,
        pendingRequestsCount,
        openFixesCount,
        failingProfilesCount,
        refreshBadges,
      }}
    >
      {children}
    </EngContext.Provider>
  )
}
```

Note: The `count_failing_profiles` RPC may be added in a migration or replaced with a client-side query. For the initial implementation, if the RPC doesn't exist, use a direct query:

```typescript
// Alternative to RPC — query latest test run per active profile
const { data: failingData } = await supabase
  .from('test_runs')
  .select('profile_id, passed')
  .order('created_at', { ascending: false })
// Group by profile_id, take latest, count where passed = false
// This is simpler done server-side — consider an API route
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/eng-provider.tsx
git commit -m "feat(eng): add EngProvider context with sidebar badge counts"
```

---

### Task 2: Sidebar Navigation

**Files:**
- Create: `src/components/eng/sidebar.tsx`

- [ ] **Step 1: Create the sidebar component**

```typescript
// src/components/eng/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Inbox,
  Wrench,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useEngContext } from './eng-provider'

const navItems = [
  { label: 'Providers', href: '/eng/providers', icon: Building2, badgeKey: null },
  { label: 'Requests', href: '/eng/requests', icon: Inbox, badgeKey: 'pendingRequestsCount' as const },
  { label: 'Fixes', href: '/eng/fixes', icon: Wrench, badgeKey: 'openFixesCount' as const },
  { label: 'Accuracy', href: '/eng/accuracy', icon: BarChart3, badgeKey: 'failingProfilesCount' as const },
  { label: 'Discovery', href: '/eng/discovery', icon: Search, badgeKey: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const ctx = useEngContext()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col border-r bg-muted/30 transition-all ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        {!collapsed && (
          <span className="text-sm font-semibold text-muted-foreground">
            Engineering
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 hover:bg-muted"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          const badgeCount = item.badgeKey ? ctx[item.badgeKey] : 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {badgeCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                      {badgeCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/sidebar.tsx
git commit -m "feat(eng): add sidebar navigation with badge counts"
```

---

### Task 3: Eng Layout and Redirect Page

**Files:**
- Create: `src/app/eng/layout.tsx`
- Create: `src/app/eng/page.tsx`

- [ ] **Step 1: Create the eng layout**

```typescript
// src/app/eng/layout.tsx
import { redirect } from 'next/navigation'
import { createEngServerClient } from '@/lib/supabase/eng-client'
import { EngProvider } from '@/components/eng/eng-provider'
import { Sidebar } from '@/components/eng/sidebar'

export default async function EngLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check engineer allowlist
  const { data: allowed } = await supabase
    .from('engineer_allowlist')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!allowed) redirect('/app')

  return (
    <EngProvider userId={user.id} email={user.email ?? ''}>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </EngProvider>
  )
}
```

- [ ] **Step 2: Create the redirect page**

```typescript
// src/app/eng/page.tsx
import { redirect } from 'next/navigation'

export default function EngPage() {
  redirect('/eng/providers')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/eng/layout.tsx src/app/eng/page.tsx
git commit -m "feat(eng): add eng layout with sidebar and redirect"
```

---

### Task 4: Provider Data Hooks

**Files:**
- Create: `src/lib/hooks/eng/use-providers.ts`
- Create: `src/lib/hooks/eng/use-provider-detail.ts`
- Create: `src/lib/hooks/eng/use-provider-mutations.ts`

- [ ] **Step 1: Create the providers list hook**

```typescript
// src/lib/hooks/eng/use-providers.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProviderListItem {
  id: string
  name: string
  displayName: string | null
  taxId: string | null
  countryCode: string
  profileCount: number
  categories: string[]
  accuracy: number | null
  lastTested: string | null
  derivedStatus: 'active' | 'draft' | 'deprecated'
}

export function useProviders() {
  const [providers, setProviders] = useState<ProviderListItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch providers with their profiles and latest test runs
    const { data: providerData } = await supabase
      .from('providers')
      .select(`
        id, name, display_name, tax_id, country_code,
        provider_invoice_profiles (
          id, category, status,
          test_runs (
            accuracy, passed, created_at
          )
        )
      `)
      .order('name')

    if (!providerData) {
      setProviders([])
      setLoading(false)
      return
    }

    const items: ProviderListItem[] = providerData.map((p) => {
      const profiles = p.provider_invoice_profiles ?? []
      const categories = [...new Set(profiles.map((pr: any) => pr.category).filter(Boolean))]

      // Derive status from profiles
      const hasActive = profiles.some((pr: any) => pr.status === 'active')
      const allDeprecated = profiles.length > 0 && profiles.every((pr: any) => pr.status === 'deprecated')
      const derivedStatus = hasActive ? 'active' : allDeprecated ? 'deprecated' : 'draft'

      // Compute weighted accuracy across profiles
      let totalWeight = 0
      let weightedSum = 0
      let lastTested: string | null = null

      for (const profile of profiles) {
        const runs = (profile as any).test_runs ?? []
        if (runs.length === 0) continue
        // Latest run
        const latest = runs.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
        const weight = runs.length // Weight by test case count approximation
        totalWeight += weight
        weightedSum += (latest.accuracy ?? 0) * weight
        if (!lastTested || new Date(latest.created_at) > new Date(lastTested)) {
          lastTested = latest.created_at
        }
      }

      return {
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        taxId: p.tax_id,
        countryCode: p.country_code,
        profileCount: profiles.length,
        categories,
        accuracy: totalWeight > 0 ? weightedSum / totalWeight : null,
        lastTested,
        derivedStatus,
      }
    })

    setProviders(items)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { providers, loading, refetch: fetch }
}
```

- [ ] **Step 2: Create the provider detail hook**

```typescript
// src/lib/hooks/eng/use-provider-detail.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProfileListItem {
  id: string
  name: string
  region: string | null
  category: string | null
  status: string
  capabilities: Record<string, any>
  accuracy: number | null
  testCaseCount: number
  lastTested: string | null
  openFixCount: number
}

export interface ProviderDetail {
  id: string
  name: string
  displayName: string | null
  taxId: string | null
  countryCode: string
  phone: string | null
  website: string | null
  logoUrl: string | null
  companyCache: {
    legalName: string | null
    tradeName: string | null
    activityCode: number | null
    activityDescription: string | null
    city: string | null
    state: string | null
    source: string | null
    fetchedAt: string | null
  } | null
  profiles: ProfileListItem[]
  openFixCount: number
}

export function useProviderDetail(providerId: string) {
  const [provider, setProvider] = useState<ProviderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('providers')
      .select(`
        *,
        company_cache (*),
        provider_invoice_profiles (
          id, name, region, category, status, capabilities,
          test_cases (id),
          test_runs (accuracy, passed, created_at),
          test_fix_requests (id, status)
        )
      `)
      .eq('id', providerId)
      .single()

    if (!data) {
      setProvider(null)
      setLoading(false)
      return
    }

    const profiles: ProfileListItem[] = (data.provider_invoice_profiles ?? []).map((p: any) => {
      const runs = p.test_runs ?? []
      const latest = runs.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      const openFixes = (p.test_fix_requests ?? []).filter((f: any) => f.status === 'open')

      return {
        id: p.id,
        name: p.name,
        region: p.region,
        category: p.category,
        status: p.status,
        capabilities: p.capabilities ?? {},
        accuracy: latest?.accuracy ?? null,
        testCaseCount: (p.test_cases ?? []).length,
        lastTested: latest?.created_at ?? null,
        openFixCount: openFixes.length,
      }
    })

    const totalOpenFixes = profiles.reduce((sum, p) => sum + p.openFixCount, 0)

    const cc = data.company_cache
    setProvider({
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      taxId: data.tax_id,
      countryCode: data.country_code,
      phone: data.phone,
      website: data.website,
      logoUrl: data.logo_url,
      companyCache: cc ? {
        legalName: cc.legal_name,
        tradeName: cc.trade_name,
        activityCode: cc.activity_code,
        activityDescription: cc.activity_description,
        city: cc.city,
        state: cc.state,
        source: cc.source,
        fetchedAt: cc.fetched_at,
      } : null,
      profiles,
      openFixCount: totalOpenFixes,
    })
    setLoading(false)
  }, [providerId])

  useEffect(() => { fetch() }, [fetch])

  return { provider, loading, refetch: fetch }
}
```

- [ ] **Step 3: Create provider mutations hook**

```typescript
// src/lib/hooks/eng/use-provider-mutations.ts
'use client'

import { useState } from 'react'

export function useProviderMutations() {
  const [loading, setLoading] = useState(false)

  const createProvider = async (data: {
    name: string
    displayName: string
    taxId: string | null
    countryCode: string
    phone: string | null
    website: string | null
  }) => {
    setLoading(true)
    const res = await fetch('/api/eng/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) throw new Error('Failed to create provider')
    return res.json()
  }

  const updateProvider = async (
    providerId: string,
    data: Partial<{
      name: string
      displayName: string
      phone: string | null
      website: string | null
    }>,
  ) => {
    setLoading(true)
    const res = await fetch(`/api/eng/providers/${providerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) throw new Error('Failed to update provider')
    return res.json()
  }

  return { createProvider, updateProvider, loading }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/eng/use-providers.ts src/lib/hooks/eng/use-provider-detail.ts src/lib/hooks/eng/use-provider-mutations.ts
git commit -m "feat(eng): add provider data hooks"
```

---

### Task 5: Provider API Routes

**Files:**
- Create: `src/app/api/eng/providers/route.ts`
- Create: `src/app/api/eng/providers/[providerId]/route.ts`

- [ ] **Step 1: Create provider POST route**

```typescript
// src/app/api/eng/providers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function POST(request: NextRequest) {
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, displayName, taxId, countryCode, phone, website } = body

  // Look up company cache if tax ID provided
  let companyCacheId: string | null = null
  if (taxId) {
    const { data: cached } = await supabase
      .from('company_cache')
      .select('id')
      .eq('tax_id', taxId.replace(/[.\-/]/g, ''))
      .single()
    companyCacheId = cached?.id ?? null
  }

  const { data, error } = await supabase
    .from('providers')
    .insert({
      name,
      display_name: displayName,
      tax_id: taxId,
      country_code: countryCode ?? 'BR',
      phone,
      website,
      company_cache_id: companyCacheId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create provider PATCH route**

```typescript
// src/app/api/eng/providers/[providerId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.displayName !== undefined) updates.display_name = body.displayName
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.website !== undefined) updates.website = body.website

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', providerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/eng/providers/route.ts src/app/api/eng/providers/\[providerId\]/route.ts
git commit -m "feat(eng): add provider API routes"
```

---

### Task 6: Profile Data Hooks and API Routes

**Files:**
- Create: `src/lib/hooks/eng/use-profile-detail.ts`
- Create: `src/lib/hooks/eng/use-profile-mutations.ts`
- Create: `src/app/api/eng/profiles/route.ts`
- Create: `src/app/api/eng/profiles/[profileId]/route.ts`

- [ ] **Step 1: Create profile detail hook**

```typescript
// src/lib/hooks/eng/use-profile-detail.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ProfileDetail {
  id: string
  providerId: string
  name: string
  region: string | null
  category: string | null
  status: string
  capabilities: Record<string, any>
  aiNotes: string | null
  minAccuracy: number
  autoAcceptThreshold: number
  reviewThreshold: number
  testCaseCount: number
  openFixCount: number
  latestAccuracy: number | null
  latestRunPassed: boolean | null
}

export function useProfileDetail(profileId: string) {
  const [profile, setProfile] = useState<ProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('provider_invoice_profiles')
      .select(`
        *,
        test_cases (id),
        test_runs (accuracy, passed, created_at),
        test_fix_requests (id, status)
      `)
      .eq('id', profileId)
      .single()

    if (!data) {
      setProfile(null)
      setLoading(false)
      return
    }

    const runs = (data.test_runs ?? []).sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const latest = runs[0]
    const openFixes = (data.test_fix_requests ?? []).filter((f: any) => f.status === 'open')

    setProfile({
      id: data.id,
      providerId: data.provider_id,
      name: data.name,
      region: data.region,
      category: data.category,
      status: data.status,
      capabilities: data.capabilities ?? {},
      aiNotes: data.ai_notes,
      minAccuracy: Number(data.min_accuracy),
      autoAcceptThreshold: Number(data.auto_accept_threshold),
      reviewThreshold: Number(data.review_threshold),
      testCaseCount: (data.test_cases ?? []).length,
      openFixCount: openFixes.length,
      latestAccuracy: latest ? Number(latest.accuracy) : null,
      latestRunPassed: latest?.passed ?? null,
    })
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  return { profile, loading, refetch: fetch }
}
```

- [ ] **Step 2: Create profile mutations hook**

```typescript
// src/lib/hooks/eng/use-profile-mutations.ts
'use client'

import { useState } from 'react'

export function useProfileMutations() {
  const [loading, setLoading] = useState(false)

  const createProfile = async (data: {
    providerId: string
    name: string
    region: string | null
    category: string
    aiNotes: string | null
    minAccuracy: number
    autoAcceptThreshold: number
    reviewThreshold: number
  }) => {
    setLoading(true)
    const res = await fetch('/api/eng/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) throw new Error('Failed to create profile')
    return res.json()
  }

  const updateProfile = async (
    profileId: string,
    data: Partial<{
      name: string
      region: string | null
      category: string
      status: string
      aiNotes: string | null
      minAccuracy: number
      autoAcceptThreshold: number
      reviewThreshold: number
    }>,
    reason?: string,
  ) => {
    setLoading(true)
    const res = await fetch(`/api/eng/profiles/${profileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, reason }),
    })
    setLoading(false)
    if (!res.ok) throw new Error('Failed to update profile')
    return res.json()
  }

  const runTests = async (profileId: string) => {
    setLoading(true)
    const res = await fetch(`/api/eng/profiles/${profileId}/run-tests`, {
      method: 'POST',
    })
    setLoading(false)
    if (!res.ok) throw new Error('Failed to run tests')
    return res.json()
  }

  return { createProfile, updateProfile, runTests, loading }
}
```

- [ ] **Step 3: Create profile API routes**

```typescript
// src/app/api/eng/profiles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function POST(request: NextRequest) {
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Fetch system defaults if thresholds not provided
  let minAccuracy = body.minAccuracy
  let autoAcceptThreshold = body.autoAcceptThreshold
  let reviewThreshold = body.reviewThreshold

  if (minAccuracy === undefined || autoAcceptThreshold === undefined || reviewThreshold === undefined) {
    const { data: defaults } = await supabase
      .from('system_thresholds')
      .select('key, value')
    const dmap = Object.fromEntries((defaults ?? []).map((d: any) => [d.key, Number(d.value)]))
    minAccuracy ??= dmap.min_accuracy ?? 0.95
    autoAcceptThreshold ??= dmap.auto_accept ?? 0.90
    reviewThreshold ??= dmap.review ?? 0.50
  }

  const { data, error } = await supabase
    .from('provider_invoice_profiles')
    .insert({
      provider_id: body.providerId,
      name: body.name,
      region: body.region,
      category: body.category,
      ai_notes: body.aiNotes,
      min_accuracy: minAccuracy,
      auto_accept_threshold: autoAcceptThreshold,
      review_threshold: reviewThreshold,
      status: 'draft',
      capabilities: { extraction: true },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

```typescript
// src/app/api/eng/profiles/[profileId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { reason, ...fields } = body

  // Build updates, converting camelCase to snake_case
  const updates: Record<string, any> = {}
  if (fields.name !== undefined) updates.name = fields.name
  if (fields.region !== undefined) updates.region = fields.region
  if (fields.category !== undefined) updates.category = fields.category
  if (fields.status !== undefined) updates.status = fields.status
  if (fields.aiNotes !== undefined) updates.ai_notes = fields.aiNotes
  if (fields.minAccuracy !== undefined) updates.min_accuracy = fields.minAccuracy
  if (fields.autoAcceptThreshold !== undefined) updates.auto_accept_threshold = fields.autoAcceptThreshold
  if (fields.reviewThreshold !== undefined) updates.review_threshold = fields.reviewThreshold

  // Log threshold changes to audit_log
  const thresholdFields = ['minAccuracy', 'autoAcceptThreshold', 'reviewThreshold']
  const thresholdChanges = thresholdFields.filter((f) => fields[f] !== undefined)

  if (thresholdChanges.length > 0 && reason) {
    // Fetch current values for old_value
    const { data: current } = await supabase
      .from('provider_invoice_profiles')
      .select('min_accuracy, auto_accept_threshold, review_threshold')
      .eq('id', profileId)
      .single()

    if (current) {
      for (const field of thresholdChanges) {
        const snakeField = field === 'minAccuracy' ? 'min_accuracy'
          : field === 'autoAcceptThreshold' ? 'auto_accept_threshold'
          : 'review_threshold'
        await supabase.from('audit_log').insert({
          entity_type: 'profile',
          entity_id: profileId,
          action: 'threshold_updated',
          old_value: { field: snakeField, value: current[snakeField as keyof typeof current] },
          new_value: { field: snakeField, value: fields[field], reason },
          changed_by: user.id,
        })
      }
    }
  }

  // Log status changes
  if (fields.status !== undefined) {
    const { data: current } = await supabase
      .from('provider_invoice_profiles')
      .select('status')
      .eq('id', profileId)
      .single()

    if (current && current.status !== fields.status) {
      await supabase.from('audit_log').insert({
        entity_type: 'profile',
        entity_id: profileId,
        action: 'status_change',
        old_value: { status: current.status },
        new_value: { status: fields.status },
        changed_by: user.id,
      })
    }
  }

  const { data, error } = await supabase
    .from('provider_invoice_profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/eng/use-profile-detail.ts src/lib/hooks/eng/use-profile-mutations.ts src/app/api/eng/profiles/route.ts src/app/api/eng/profiles/\[profileId\]/route.ts
git commit -m "feat(eng): add profile data hooks and API routes"
```

---

### Task 7: Provider Registry Page

**Files:**
- Create: `src/components/eng/provider-registry-table.tsx`
- Create: `src/app/eng/providers/page.tsx`

- [ ] **Step 1: Create the registry table component**

```typescript
// src/components/eng/provider-registry-table.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import { Sparkline } from '@/components/eng/sparkline'
import { useProviders, type ProviderListItem } from '@/lib/hooks/eng/use-providers'

const statusOrder = { active: 0, draft: 1, deprecated: 2 }

export function ProviderRegistryTable() {
  const { providers, loading } = useProviders()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filtered = providers
    .filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        const matchesName = (p.displayName ?? p.name).toLowerCase().includes(q)
        const matchesTaxId = p.taxId?.includes(q)
        return matchesName || matchesTaxId
      }
      return true
    })
    .filter((p) => !statusFilter || p.derivedStatus === statusFilter)
    .sort((a, b) => {
      // Failing first, then near-threshold, then healthy
      const aScore = a.accuracy === null ? 1 : a.accuracy < 0.95 ? 0 : 2
      const bScore = b.accuracy === null ? 1 : b.accuracy < 0.95 ? 0 : 2
      if (aScore !== bScore) return aScore - bScore
      return (a.accuracy ?? 0) - (b.accuracy ?? 0)
    })

  if (loading) return <div className="p-8 text-muted-foreground">Loading providers...</div>

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search by name or tax ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={statusFilter ?? ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Provider</th>
            <th className="pb-2 font-medium">Tax ID</th>
            <th className="pb-2 font-medium">Profiles</th>
            <th className="pb-2 font-medium">Categories</th>
            <th className="pb-2 font-medium">Accuracy</th>
            <th className="pb-2 font-medium">Last Tested</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr
              key={p.id}
              className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/eng/providers/${p.id}`)}
            >
              <td className="py-3 font-medium">{p.displayName ?? p.name}</td>
              <td className="py-3 text-muted-foreground font-mono text-xs">
                {p.taxId ?? '—'}
              </td>
              <td className="py-3">{p.profileCount}</td>
              <td className="py-3">
                <div className="flex gap-1 flex-wrap">
                  {p.categories.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </td>
              <td className="py-3">
                {p.accuracy !== null ? (
                  <div className="flex items-center gap-2">
                    <ThresholdBadge value={p.accuracy} threshold={0.95} format="percent" />
                    <Sparkline data={[]} threshold={0.95} />
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 text-muted-foreground">
                {p.lastTested
                  ? new Date(p.lastTested).toLocaleDateString()
                  : '—'}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                No providers found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create the registry page**

```typescript
// src/app/eng/providers/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ProviderRegistryTable } from '@/components/eng/provider-registry-table'

export default function ProvidersPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Providers</h1>
        <Link href="/eng/providers/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Provider
          </Button>
        </Link>
      </div>
      <ProviderRegistryTable />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/provider-registry-table.tsx src/app/eng/providers/page.tsx
git commit -m "feat(eng): add provider registry page with table"
```

---

### Task 8: Provider Creation Page

**Files:**
- Create: `src/components/eng/provider-form.tsx`
- Create: `src/app/eng/providers/new/page.tsx`

- [ ] **Step 1: Create the provider form component**

```typescript
// src/components/eng/provider-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useProviderMutations } from '@/lib/hooks/eng/use-provider-mutations'
import { lookupCnpj } from '@/lib/billing-intelligence/identification/cnpj-lookup'

export function ProviderForm() {
  const router = useRouter()
  const { createProvider, loading } = useProviderMutations()

  const [taxId, setTaxId] = useState('')
  const [lookupDone, setLookupDone] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [countryCode, setCountryCode] = useState('BR')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  const handleLookup = async () => {
    if (!taxId.trim()) return
    setLookingUp(true)
    try {
      const result = await lookupCnpj(taxId.replace(/[.\-/]/g, ''))
      if (result) {
        setName(result.companyName)
        setDisplayName(result.companyName)
      }
      setLookupDone(true)
    } catch {
      setLookupDone(true)
    }
    setLookingUp(false)
  }

  const handleSubmit = async () => {
    const result = await createProvider({
      name,
      displayName,
      taxId: taxId.replace(/[.\-/]/g, '') || null,
      countryCode,
      phone: phone || null,
      website: website || null,
    })
    router.push(`/eng/providers/${result.id}`)
  }

  const fieldsDisabled = !lookupDone

  return (
    <Card className="max-w-lg p-6 space-y-4">
      <div className="space-y-2">
        <Label>Tax ID</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Enter tax ID (e.g., CNPJ)"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
          />
          <Button onClick={handleLookup} disabled={lookingUp || !taxId.trim()} variant="secondary">
            {lookingUp ? 'Looking up...' : 'Lookup'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={fieldsDisabled} />
      </div>

      <div className="space-y-2">
        <Label>Display Name</Label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={fieldsDisabled} />
      </div>

      <div className="space-y-2">
        <Label>Country Code</Label>
        <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} disabled={fieldsDisabled} />
      </div>

      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={fieldsDisabled} />
      </div>

      <div className="space-y-2">
        <Label>Website</Label>
        <Input value={website} onChange={(e) => setWebsite(e.target.value)} disabled={fieldsDisabled} />
      </div>

      <Button onClick={handleSubmit} disabled={loading || fieldsDisabled || !name} className="w-full">
        {loading ? 'Creating...' : 'Create Provider'}
      </Button>
    </Card>
  )
}
```

- [ ] **Step 2: Create the page**

```typescript
// src/app/eng/providers/new/page.tsx
import { ProviderForm } from '@/components/eng/provider-form'

export default function NewProviderPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Provider</h1>
      <p className="text-muted-foreground">
        Enter a tax ID to look up company information, or upload a bill to extract it.
      </p>
      <ProviderForm />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/provider-form.tsx src/app/eng/providers/new/page.tsx
git commit -m "feat(eng): add provider creation page with tax ID lookup"
```

---

### Task 9: Provider Detail Page

**Files:**
- Create: `src/app/eng/providers/[providerId]/page.tsx`

- [ ] **Step 1: Create the provider detail page**

```typescript
// src/app/eng/providers/[providerId]/page.tsx
'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import { Sparkline } from '@/components/eng/sparkline'
import { EmptyState } from '@/components/eng/empty-state'
import { useProviderDetail } from '@/lib/hooks/eng/use-provider-detail'
import { Plus, Building2, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function ProviderDetailPage({
  params,
}: {
  params: Promise<{ providerId: string }>
}) {
  const { providerId } = use(params)
  const { provider, loading } = useProviderDetail(providerId)
  const router = useRouter()

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>
  if (!provider) return <div className="p-6">Provider not found</div>

  const hasActive = provider.profiles.some((p) => p.status === 'active')
  const allDeprecated = provider.profiles.length > 0 && provider.profiles.every((p) => p.status === 'deprecated')
  const derivedStatus = hasActive ? 'active' : allDeprecated ? 'deprecated' : 'draft'

  const categories = [...new Set(provider.profiles.map((p) => p.category).filter(Boolean))]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{provider.displayName ?? provider.name}</h1>
          {provider.taxId && (
            <p className="text-sm text-muted-foreground font-mono mt-1">{provider.taxId}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={derivedStatus === 'active' ? 'default' : 'secondary'}>
            {derivedStatus}
          </Badge>
          {provider.openFixCount > 0 && (
            <Link href={`/eng/fixes?provider=${providerId}`}>
              <Badge variant="destructive" className="gap-1">
                <Wrench className="h-3 w-3" />
                {provider.openFixCount} open {provider.openFixCount === 1 ? 'fix' : 'fixes'}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Company Info */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Company Info</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {provider.name}</div>
          <div><span className="text-muted-foreground">Country:</span> {provider.countryCode}</div>
          {provider.phone && <div><span className="text-muted-foreground">Phone:</span> {provider.phone}</div>}
          {provider.website && <div><span className="text-muted-foreground">Website:</span> {provider.website}</div>}
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1">
            {categories.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}
        {provider.companyCache && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Raw company data
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs bg-muted/50 p-3 rounded">
              <div>Legal name: {provider.companyCache.legalName ?? '—'}</div>
              <div>Trade name: {provider.companyCache.tradeName ?? '—'}</div>
              <div>Activity: {provider.companyCache.activityDescription ?? '—'}</div>
              <div>Location: {provider.companyCache.city}, {provider.companyCache.state}</div>
              <div>Source: {provider.companyCache.source}</div>
              <div>Fetched: {provider.companyCache.fetchedAt ? new Date(provider.companyCache.fetchedAt).toLocaleDateString() : '—'}</div>
            </div>
          </details>
        )}
      </Card>

      {/* Profiles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Profiles</h2>
          <Link href={`/eng/providers/${providerId}/new-profile`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </Link>
        </div>

        {provider.profiles.length === 0 ? (
          <EmptyState
            icon={Building2}
            heading="No profiles yet"
            description="Create a profile to start building extraction for this provider."
            action={{ label: 'New Profile', href: `/eng/providers/${providerId}/new-profile` }}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Profile</th>
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Capabilities</th>
                <th className="pb-2 font-medium">Accuracy</th>
                <th className="pb-2 font-medium">Tests</th>
                <th className="pb-2 font-medium">Last Tested</th>
              </tr>
            </thead>
            <tbody>
              {provider.profiles.map((p) => (
                <tr
                  key={p.id}
                  className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/eng/providers/${providerId}/${p.id}/overview`)}
                >
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-muted-foreground">{p.region ?? '—'}</td>
                  <td className="py-3">
                    {p.category ? <Badge variant="outline" className="text-xs">{p.category}</Badge> : '—'}
                  </td>
                  <td className="py-3">
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {p.status}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {p.capabilities.extraction && <Badge variant="outline" className="text-xs">extraction</Badge>}
                      {p.capabilities.validation && <Badge variant="outline" className="text-xs">validation</Badge>}
                      {p.capabilities.paymentStatus && <Badge variant="outline" className="text-xs">payment</Badge>}
                    </div>
                  </td>
                  <td className="py-3">
                    {p.accuracy !== null ? (
                      <div className="flex items-center gap-2">
                        <ThresholdBadge value={p.accuracy} threshold={0.95} format="percent" />
                        <Sparkline data={[]} threshold={0.95} />
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-3">{p.testCaseCount}</td>
                  <td className="py-3 text-muted-foreground">
                    {p.lastTested ? new Date(p.lastTested).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/eng/providers/\[providerId\]/page.tsx
git commit -m "feat(eng): add provider detail page with profiles table"
```

---

### Task 10: Profile Creation Page

**Files:**
- Create: `src/components/eng/profile-form.tsx`
- Create: `src/app/eng/providers/[providerId]/new-profile/page.tsx`

- [ ] **Step 1: Create the profile form**

```typescript
// src/components/eng/profile-form.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useProfileMutations } from '@/lib/hooks/eng/use-profile-mutations'
import { createClient } from '@/lib/supabase/client'

interface Props {
  providerId: string
}

export function ProfileForm({ providerId }: Props) {
  const router = useRouter()
  const { createProfile, loading } = useProfileMutations()

  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [category, setCategory] = useState('electricity')
  const [aiNotes, setAiNotes] = useState('')
  const [minAccuracy, setMinAccuracy] = useState(0.95)
  const [autoAccept, setAutoAccept] = useState(0.90)
  const [review, setReview] = useState(0.50)

  // Load system defaults
  useEffect(() => {
    const loadDefaults = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('system_thresholds').select('key, value')
      if (data) {
        const dmap = Object.fromEntries(data.map((d) => [d.key, Number(d.value)]))
        if (dmap.min_accuracy) setMinAccuracy(dmap.min_accuracy)
        if (dmap.auto_accept) setAutoAccept(dmap.auto_accept)
        if (dmap.review) setReview(dmap.review)
      }
    }
    loadDefaults()
  }, [])

  const handleSubmit = async () => {
    const result = await createProfile({
      providerId,
      name,
      region: region || null,
      category,
      aiNotes: aiNotes || null,
      minAccuracy,
      autoAcceptThreshold: autoAccept,
      reviewThreshold: review,
    })
    router.push(`/eng/providers/${providerId}/${result.id}/overview`)
  }

  return (
    <Card className="max-w-lg p-6 space-y-4">
      <div className="space-y-2">
        <Label>Display Name</Label>
        <Input placeholder="e.g., Enliv (Campeche)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Region</Label>
        <Input placeholder="e.g., SC-florianopolis-campeche" value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="electricity">Electricity</option>
          <option value="water">Water</option>
          <option value="gas">Gas</option>
          <option value="internet">Internet</option>
          <option value="condo">Condo</option>
          <option value="sewer">Sewer</option>
          <option value="insurance">Insurance</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Notes for AI</Label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
          placeholder="Context for Claude: API info, scraping targets, bill format notes, vault secret references..."
          value={aiNotes}
          onChange={(e) => setAiNotes(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Min Accuracy</Label>
          <Input type="number" step="0.01" min="0" max="1" value={minAccuracy} onChange={(e) => setMinAccuracy(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Auto Accept</Label>
          <Input type="number" step="0.01" min="0" max="1" value={autoAccept} onChange={(e) => setAutoAccept(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Review</Label>
          <Input type="number" step="0.01" min="0" max="1" value={review} onChange={(e) => setReview(Number(e.target.value))} />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={loading || !name} className="w-full">
        {loading ? 'Creating...' : 'Create Profile'}
      </Button>
    </Card>
  )
}
```

- [ ] **Step 2: Create the page**

```typescript
// src/app/eng/providers/[providerId]/new-profile/page.tsx
'use client'

import { use } from 'react'
import { ProfileForm } from '@/components/eng/profile-form'

export default function NewProfilePage({
  params,
}: {
  params: Promise<{ providerId: string }>
}) {
  const { providerId } = use(params)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Profile</h1>
      <p className="text-muted-foreground">
        Create a new bill format profile for this provider. Starts in draft status.
      </p>
      <ProfileForm providerId={providerId} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/profile-form.tsx src/app/eng/providers/\[providerId\]/new-profile/page.tsx
git commit -m "feat(eng): add profile creation page with system defaults"
```

---

### Task 11: Profile Tabs Layout

**Files:**
- Create: `src/components/eng/profile-tabs.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/layout.tsx`

- [ ] **Step 1: Create the tab navigation component**

```typescript
// src/components/eng/profile-tabs.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  providerId: string
  profileId: string
}

const tabs = [
  { label: 'Overview', segment: 'overview' },
  { label: 'Test Cases', segment: 'test-cases' },
  { label: 'Pipeline', segment: 'pipeline' },
]

export function ProfileTabs({ providerId, profileId }: Props) {
  const pathname = usePathname()
  const basePath = `/eng/providers/${providerId}/${profileId}`

  return (
    <div className="border-b">
      <nav className="flex gap-6 px-6">
        {tabs.map((tab) => {
          const href = `${basePath}/${tab.segment}`
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

- [ ] **Step 2: Create the profile layout**

```typescript
// src/app/eng/providers/[providerId]/[profileId]/layout.tsx
'use client'

import { use } from 'react'
import { ProfileTabs } from '@/components/eng/profile-tabs'
import { useProfileDetail } from '@/lib/hooks/eng/use-profile-detail'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { providerId, profileId } = use(params)
  const { profile } = useProfileDetail(profileId)

  return (
    <div>
      {/* Breadcrumb + Profile header */}
      <div className="px-6 pt-4 pb-0 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/eng/providers" className="hover:text-foreground">Providers</Link>
          <span>/</span>
          <Link href={`/eng/providers/${providerId}`} className="hover:text-foreground">
            {profile?.name ?? 'Loading...'}
          </Link>
          <span>/</span>
          <span className="text-foreground">{profile?.name ?? '...'}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{profile?.name ?? 'Loading...'}</h1>
          {profile && (
            <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
              {profile.status}
            </Badge>
          )}
        </div>
      </div>

      <ProfileTabs providerId={providerId} profileId={profileId} />

      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/profile-tabs.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/layout.tsx
git commit -m "feat(eng): add profile tabs layout with breadcrumb"
```

---

### Task 12: Profile Overview Tab

**Files:**
- Create: `src/app/eng/providers/[providerId]/[profileId]/overview/page.tsx`

- [ ] **Step 1: Create the overview page**

```typescript
// src/app/eng/providers/[providerId]/[profileId]/overview/page.tsx
'use client'

import { use } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import { ThresholdManagement } from '@/components/eng/threshold-management'
import { TrendChart } from '@/components/eng/trend-chart'
import { useProfileDetail } from '@/lib/hooks/eng/use-profile-detail'
import { useProfileMutations } from '@/lib/hooks/eng/use-profile-mutations'
import { Info } from 'lucide-react'

export default function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { profileId } = use(params)
  const { profile, loading, refetch } = useProfileDetail(profileId)
  const { updateProfile } = useProfileMutations()

  if (loading || !profile) return <div className="text-muted-foreground">Loading...</div>

  const canPromote =
    profile.status === 'draft' &&
    profile.latestAccuracy !== null &&
    profile.latestAccuracy >= profile.minAccuracy

  const handlePromote = async () => {
    await updateProfile(profileId, { status: 'active' })
    refetch()
  }

  const handleDeprecate = async () => {
    await updateProfile(profileId, { status: 'deprecated' })
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Below threshold banner */}
      {profile.status === 'active' && profile.latestAccuracy !== null && profile.latestAccuracy < profile.minAccuracy && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          Accuracy has dropped below minimum threshold ({(profile.minAccuracy * 100).toFixed(0)}%). Current: {(profile.latestAccuracy * 100).toFixed(1)}%.
        </div>
      )}

      {/* Metadata */}
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Profile Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Region:</span> {profile.region ?? '—'}</div>
          <div><span className="text-muted-foreground">Category:</span> {profile.category ?? '—'}</div>
          <div><span className="text-muted-foreground">Test Cases:</span> {profile.testCaseCount}</div>
          <div><span className="text-muted-foreground">Open Fixes:</span> {profile.openFixCount}</div>
        </div>

        {/* Status controls */}
        <div className="flex gap-2 pt-2">
          {profile.status === 'draft' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" onClick={handlePromote} disabled={!canPromote}>
                      Promote to Active
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canPromote && (
                  <TooltipContent>
                    Accuracy must meet minimum threshold ({(profile.minAccuracy * 100).toFixed(0)}%) to activate.
                    {profile.latestAccuracy !== null
                      ? ` Current: ${(profile.latestAccuracy * 100).toFixed(1)}%.`
                      : ' No test runs yet.'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {profile.status === 'active' && (
            <Button size="sm" variant="outline" onClick={handleDeprecate}>
              Deprecate
            </Button>
          )}
        </div>
      </Card>

      {/* Capabilities */}
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Capabilities</h2>
        <div className="flex gap-2">
          <Badge variant={profile.capabilities.extraction ? 'default' : 'secondary'}>extraction</Badge>
          <Badge variant={profile.capabilities.validation ? 'default' : 'secondary'}>validation</Badge>
          <Badge variant={profile.capabilities.paymentStatus ? 'default' : 'secondary'}>payment detection</Badge>
          <Badge variant={profile.capabilities.apiLookup ? 'default' : 'secondary'}>API lookup</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Capabilities are read-only — updated by AI when implemented.</p>
      </Card>

      {/* Notes for AI */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Notes for AI</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Persistent context for Claude: API info, scraping targets, bill format notes, vault secret references.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
          value={profile.aiNotes ?? ''}
          onChange={(e) => updateProfile(profileId, { aiNotes: e.target.value })}
          placeholder="Add context for Claude..."
        />
      </Card>

      {/* Threshold Management */}
      <ThresholdManagement
        profileId={profileId}
        minAccuracy={profile.minAccuracy}
        autoAcceptThreshold={profile.autoAcceptThreshold}
        reviewThreshold={profile.reviewThreshold}
        currentAccuracy={profile.latestAccuracy}
        testCaseCount={profile.testCaseCount}
        onSave={async (thresholds, reason) => {
          await updateProfile(profileId, thresholds, reason)
          refetch()
        }}
      />

      {/* Accuracy Trend */}
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Accuracy Trend</h2>
        <TrendChart
          data={[]}
          threshold={profile.minAccuracy}
          annotations={[]}
        />
        <p className="text-xs text-muted-foreground">Data loaded from test run history.</p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/eng/providers/\[providerId\]/\[profileId\]/overview/page.tsx
git commit -m "feat(eng): add profile overview tab with thresholds and capabilities"
```

---

### Task 13: Test Cases Tab — List and Detail

**Files:**
- Create: `src/lib/hooks/eng/use-test-cases.ts`
- Create: `src/lib/hooks/eng/use-test-case-detail.ts`
- Create: `src/components/eng/test-case-list.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/test-cases/page.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/test-cases/[caseId]/page.tsx`

- [ ] **Step 1: Create test cases hooks**

```typescript
// src/lib/hooks/eng/use-test-cases.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TestCaseListItem {
  id: string
  profileId: string
  competency: string
  description: string | null
  testBillId: string | null
  sourceData: any
  createdBy: string
  createdAt: string
  lastResult: boolean | null
  openFixCount: number
}

export function useTestCases(profileId: string) {
  const [testCases, setTestCases] = useState<TestCaseListItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('test_cases')
      .select(`
        id, profile_id, competency, description, test_bill_id,
        source_data, created_by, created_at,
        test_fix_requests (id, status)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    const items: TestCaseListItem[] = (data ?? []).map((tc: any) => ({
      id: tc.id,
      profileId: tc.profile_id,
      competency: tc.competency,
      description: tc.description,
      testBillId: tc.test_bill_id,
      sourceData: tc.source_data,
      createdBy: tc.created_by,
      createdAt: tc.created_at,
      lastResult: null, // Populated from latest test run report
      openFixCount: (tc.test_fix_requests ?? []).filter((f: any) => f.status === 'open').length,
    }))

    setTestCases(items)
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  return { testCases, loading, refetch: fetch }
}
```

```typescript
// src/lib/hooks/eng/use-test-case-detail.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TestCaseDetail {
  id: string
  profileId: string
  competency: string
  description: string | null
  testBillId: string | null
  sourceData: any
  expectedFields: Record<string, any>
  createdBy: string
  createdAt: string
  fixRequests: Array<{
    id: string
    status: string
    engineerNotes: string
    createdAt: string
  }>
}

export function useTestCaseDetail(caseId: string) {
  const [testCase, setTestCase] = useState<TestCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('test_cases')
      .select(`
        *,
        test_fix_requests (id, status, engineer_notes, created_at)
      `)
      .eq('id', caseId)
      .single()

    if (!data) {
      setTestCase(null)
      setLoading(false)
      return
    }

    setTestCase({
      id: data.id,
      profileId: data.profile_id,
      competency: data.competency,
      description: data.description,
      testBillId: data.test_bill_id,
      sourceData: data.source_data,
      expectedFields: data.expected_fields,
      createdBy: data.created_by,
      createdAt: data.created_at,
      fixRequests: (data.test_fix_requests ?? []).map((f: any) => ({
        id: f.id,
        status: f.status,
        engineerNotes: f.engineer_notes,
        createdAt: f.created_at,
      })),
    })
    setLoading(false)
  }, [caseId])

  useEffect(() => { fetch() }, [fetch])

  return { testCase, loading, refetch: fetch }
}
```

- [ ] **Step 2: Create the test case list component**

```typescript
// src/components/eng/test-case-list.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTestCases } from '@/lib/hooks/eng/use-test-cases'
import { Wrench, Plus } from 'lucide-react'

interface Props {
  providerId: string
  profileId: string
}

export function TestCaseList({ providerId, profileId }: Props) {
  const { testCases, loading } = useTestCases(profileId)
  const router = useRouter()
  const [competencyFilter, setCompetencyFilter] = useState<string | null>(null)

  const filtered = competencyFilter
    ? testCases.filter((tc) => tc.competency === competencyFilter)
    : testCases

  if (loading) return <div className="text-muted-foreground">Loading test cases...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border px-3 py-2 text-sm"
          value={competencyFilter ?? ''}
          onChange={(e) => setCompetencyFilter(e.target.value || null)}
        >
          <option value="">All competencies</option>
          <option value="identification">Identification</option>
          <option value="extraction">Extraction</option>
          <option value="validation">Validation</option>
          <option value="payment_matching">Payment Matching</option>
          <option value="invoice_discovery">Invoice Discovery</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Competency</th>
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 font-medium">Source</th>
            <th className="pb-2 font-medium">Created by</th>
            <th className="pb-2 font-medium">Created</th>
            <th className="pb-2 font-medium">Last Result</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((tc) => (
            <tr
              key={tc.id}
              className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                router.push(`/eng/providers/${providerId}/${profileId}/test-cases/${tc.id}`)
              }
            >
              <td className="py-3">
                <Badge variant="outline" className="text-xs">{tc.competency}</Badge>
              </td>
              <td className="py-3">{tc.description ?? '—'}</td>
              <td className="py-3 text-muted-foreground text-xs">
                {tc.testBillId ? 'Bill PDF' : tc.sourceData ? 'Source data' : '—'}
              </td>
              <td className="py-3 text-muted-foreground">{tc.createdBy}</td>
              <td className="py-3 text-muted-foreground">
                {new Date(tc.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  {tc.lastResult === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : tc.lastResult ? (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Pass</Badge>
                  ) : (
                    <Badge className="bg-rose-100 text-rose-800 text-xs">Fail</Badge>
                  )}
                  {tc.openFixCount > 0 && (
                    <Wrench className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                No test cases found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create test cases page and detail page**

```typescript
// src/app/eng/providers/[providerId]/[profileId]/test-cases/page.tsx
'use client'

import { use } from 'react'
import { Button } from '@/components/ui/button'
import { TestCaseList } from '@/components/eng/test-case-list'
import { useProfileMutations } from '@/lib/hooks/eng/use-profile-mutations'
import { Plus, Play } from 'lucide-react'

export default function TestCasesPage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { providerId, profileId } = use(params)
  const { runTests, loading: running } = useProfileMutations()

  const handleRunTests = async () => {
    await runTests(profileId)
    // Refetch will happen via the list component
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Test Cases</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRunTests} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? 'Running...' : 'Run Tests'}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Test Case
          </Button>
        </div>
      </div>
      <TestCaseList providerId={providerId} profileId={profileId} />
    </div>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/test-cases/[caseId]/page.tsx
'use client'

import { use } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestCaseLayout } from '@/components/eng/test-case-layout'
import { SourceDataPanel } from '@/components/eng/source-data-panel'
import { ExpectedResultsPanel } from '@/components/eng/expected-results-panel'
import { ExternalDataPanel } from '@/components/eng/external-data-panel'
import { useTestCaseDetail } from '@/lib/hooks/eng/use-test-case-detail'
import { Flag, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string; caseId: string }>
}) {
  const { providerId, profileId, caseId } = use(params)
  const { testCase, loading } = useTestCaseDetail(caseId)

  if (loading) return <div className="text-muted-foreground">Loading...</div>
  if (!testCase) return <div>Test case not found</div>

  const needsExternalPanel = ['validation', 'payment_matching', 'invoice_discovery'].includes(testCase.competency)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{testCase.competency}</Badge>
            <span className="text-sm text-muted-foreground">Created by {testCase.createdBy}</span>
          </div>
          <h2 className="text-lg font-medium">{testCase.description ?? 'Untitled test case'}</h2>
        </div>
        <Button size="sm" variant="outline">
          <Flag className="h-4 w-4" />
          Flag for Fix
        </Button>
      </div>

      {/* Fix requests for this test case */}
      {testCase.fixRequests.length > 0 && (
        <Card className="p-3 space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Fix Requests ({testCase.fixRequests.length})
          </h3>
          {testCase.fixRequests.map((fix) => (
            <Link
              key={fix.id}
              href={`/eng/fixes/${fix.id}`}
              className="block text-sm p-2 rounded hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Badge variant={fix.status === 'open' ? 'destructive' : 'secondary'} className="text-xs">
                  {fix.status}
                </Badge>
                <span className="text-muted-foreground truncate">{fix.engineerNotes}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}

      {/* Competency-aware panels */}
      {needsExternalPanel ? (
        <TestCaseLayout
          variant="three-panel"
          sourcePanel={
            <SourceDataPanel
              type={testCase.testBillId ? 'pdf' : 'data'}
              storagePath={testCase.testBillId ? `test-bills/${testCase.testBillId}` : undefined}
              data={testCase.sourceData}
            />
          }
          externalPanel={
            <ExternalDataPanel
              sourceType="api"
              data={{}}
              metadata={{ note: 'Run the pipeline to see external data' }}
            />
          }
          expectedPanel={
            <ExpectedResultsPanel
              expectedFields={testCase.expectedFields}
              actualFields={{}}
            />
          }
        />
      ) : (
        <TestCaseLayout
          variant="two-panel"
          sourcePanel={
            <SourceDataPanel
              type={testCase.testBillId ? 'pdf' : 'data'}
              storagePath={testCase.testBillId ? `test-bills/${testCase.testBillId}` : undefined}
              data={testCase.sourceData}
            />
          }
          expectedPanel={
            <ExpectedResultsPanel
              expectedFields={testCase.expectedFields}
              actualFields={{}}
            />
          }
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/eng/use-test-cases.ts src/lib/hooks/eng/use-test-case-detail.ts src/components/eng/test-case-list.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/test-cases/page.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/test-cases/\[caseId\]/page.tsx
git commit -m "feat(eng): add test cases tab with list and detail views"
```

---

### Task 14: Pipeline Tab

**Files:**
- Create: `src/components/eng/pipeline-section.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/pipeline/page.tsx`

- [ ] **Step 1: Create the pipeline section component**

```typescript
// src/components/eng/pipeline-section.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/eng/empty-state'
import { JsonViewer } from '@/components/eng/json-viewer'
import { Flag, Play, AlertCircle } from 'lucide-react'

interface Props {
  title: string
  competency: string
  available: boolean
  onRun?: () => Promise<any>
  onFlagForFix?: (result: any) => void
}

export function PipelineSection({ title, competency, available, onRun, onFlagForFix }: Props) {
  const [result, setResult] = useState<any>(null)
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    if (!onRun) return
    setRunning(true)
    try {
      const res = await onRun()
      setResult(res)
    } catch (err) {
      setResult({ error: String(err) })
    }
    setRunning(false)
  }

  if (!available) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">{title}</h3>
          <Badge variant="secondary" className="text-xs">Not available</Badge>
        </div>
        <EmptyState
          icon={AlertCircle}
          heading={`No ${competency} capability`}
          description="This profile doesn't have this capability yet. Add context in Notes for AI to help Claude build it."
        />
      </Card>
    )
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <div className="flex gap-2">
          {result && onFlagForFix && (
            <Button size="sm" variant="outline" onClick={() => onFlagForFix(result)}>
              <Flag className="h-4 w-4" />
              Flag for Fix
            </Button>
          )}
          <Button size="sm" onClick={handleRun} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {result && (
        <div className="border rounded p-3 bg-muted/30">
          <JsonViewer data={result} />
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Create the pipeline page**

```typescript
// src/app/eng/providers/[providerId]/[profileId]/pipeline/page.tsx
'use client'

import { use } from 'react'
import { PipelineSection } from '@/components/eng/pipeline-section'
import { useProfileDetail } from '@/lib/hooks/eng/use-profile-detail'

export default function PipelinePage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { profileId } = use(params)
  const { profile } = useProfileDetail(profileId)

  if (!profile) return <div className="text-muted-foreground">Loading...</div>

  const caps = profile.capabilities

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Pipeline Test Lab</h2>
      <p className="text-sm text-muted-foreground">
        Test individual pipeline steps for this provider. Upload or select a bill to run through each step.
      </p>

      <div className="space-y-4">
        <PipelineSection
          title="1. Identify"
          competency="identification"
          available={true}
        />
        <PipelineSection
          title="2. Extract"
          competency="extraction"
          available={!!caps.extraction}
        />
        <PipelineSection
          title="3. Validate"
          competency="validation"
          available={!!caps.validation}
        />
        <PipelineSection
          title="4. Match Payment"
          competency="payment_matching"
          available={!!caps.paymentStatus}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/pipeline-section.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/pipeline/page.tsx
git commit -m "feat(eng): add pipeline test lab tab"
```

---

### Task 15: Fix Request Creation API and Modal

**Files:**
- Create: `src/app/api/eng/fix-requests/route.ts`
- Create: `src/components/eng/flag-for-fix-modal.tsx`

- [ ] **Step 1: Create fix request API route**

```typescript
// src/app/api/eng/fix-requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function POST(request: NextRequest) {
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('test_fix_requests')
    .insert({
      profile_id: body.profileId,
      test_case_id: body.testCaseId ?? null,
      test_run_id: body.testRunId ?? null,
      provider_request_id: body.providerRequestId ?? null,
      competency: body.competency,
      source_data: body.sourceData ?? null,
      actual_result: body.actualResult,
      expected_result: body.expectedResult ?? null,
      raw_external: body.rawExternal ?? null,
      engineer_notes: body.engineerNotes,
      status: 'open',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create the flag for fix modal**

```typescript
// src/components/eng/flag-for-fix-modal.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  profileId: string
  competency: string
  testCaseId?: string
  testRunId?: string
  providerRequestId?: string
  sourceData?: any
  actualResult: any
  expectedResult?: any
  rawExternal?: any
}

export function FlagForFixModal({
  open,
  onClose,
  profileId,
  competency,
  testCaseId,
  testRunId,
  providerRequestId,
  sourceData,
  actualResult,
  expectedResult,
  rawExternal,
}: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!notes.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/eng/fix-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          competency,
          testCaseId,
          testRunId,
          providerRequestId,
          sourceData,
          actualResult,
          expectedResult,
          rawExternal,
          engineerNotes: notes,
        }),
      })
      if (!res.ok) throw new Error('Failed to create fix request')
      const data = await res.json()
      toast.success(`Fix request created: ${data.id.slice(0, 8)}`)
      onClose()
      setNotes('')
    } catch {
      toast.error('Failed to create fix request')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Flag for Fix</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Describe what&apos;s wrong and what the correct result should be. This context helps the AI understand and fix the issue.
          </div>
          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[120px]"
              placeholder="e.g., Installation number format mismatch — API uses dashes, extraction strips them"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !notes.trim()}>
              {saving ? 'Creating...' : 'Create Fix Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/eng/fix-requests/route.ts src/components/eng/flag-for-fix-modal.tsx
git commit -m "feat(eng): add fix request creation API and modal"
```

---

### Task 16: Test Case and Profile API Routes

**Files:**
- Create: `src/app/api/eng/profiles/[profileId]/run-tests/route.ts`
- Create: `src/app/api/eng/profiles/[profileId]/test-cases/route.ts`
- Create: `src/app/api/eng/profiles/[profileId]/test-cases/[caseId]/route.ts`

- [ ] **Step 1: Create run-tests API route**

```typescript
// src/app/api/eng/profiles/[profileId]/run-tests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch test cases for this profile
  const { data: testCases } = await supabase
    .from('test_cases')
    .select('*')
    .eq('profile_id', profileId)

  if (!testCases || testCases.length === 0) {
    return NextResponse.json({ error: 'No test cases found' }, { status: 400 })
  }

  // TODO: Integrate with the actual test runner pipeline from Plan 3a-6
  // For now, store a placeholder test run
  const totalFields = testCases.length * 5 // Approximate
  const passedFields = totalFields // Placeholder: all pass

  const { data: run, error } = await supabase
    .from('test_runs')
    .insert({
      profile_id: profileId,
      total_cases: testCases.length,
      total_fields: totalFields,
      passed_fields: passedFields,
      accuracy: totalFields > 0 ? passedFields / totalFields : 0,
      min_accuracy_threshold: null,
      passed: true,
      report: { cases: [], placeholder: true },
      triggered_by: 'playground',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(run, { status: 201 })
}
```

- [ ] **Step 2: Create test case CRUD routes**

```typescript
// src/app/api/eng/profiles/[profileId]/test-cases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('test_cases')
    .insert({
      profile_id: profileId,
      competency: body.competency,
      description: body.description,
      test_bill_id: body.testBillId ?? null,
      source_data: body.sourceData ?? null,
      expected_fields: body.expectedFields,
      created_by: 'engineer',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

```typescript
// src/app/api/eng/profiles/[profileId]/test-cases/[caseId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string; caseId: string }> },
) {
  const { caseId } = await params
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}
  if (body.description !== undefined) updates.description = body.description
  if (body.expectedFields !== undefined) updates.expected_fields = body.expectedFields
  if (body.sourceData !== undefined) updates.source_data = body.sourceData

  const { data, error } = await supabase
    .from('test_cases')
    .update(updates)
    .eq('id', caseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string; caseId: string }> },
) {
  const { caseId } = await params
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('test_cases')
    .delete()
    .eq('id', caseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/eng/profiles/\[profileId\]/run-tests/route.ts src/app/api/eng/profiles/\[profileId\]/test-cases/route.ts src/app/api/eng/profiles/\[profileId\]/test-cases/\[caseId\]/route.ts
git commit -m "feat(eng): add test case CRUD and run-tests API routes"
```

---

### Task 17: Verify All Pages Compile

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors related to eng pages. Fix any import or type issues.

- [ ] **Step 2: Run dev server and manually check routes**

```bash
npm run dev
```

Visit:
- `/eng/providers` — should show registry table
- `/eng/providers/new` — should show creation form
- `/eng/providers/[id]` — should show detail (with a real provider ID)
- `/eng/providers/[id]/[profileId]/overview` — should show overview tab
- `/eng/providers/[id]/[profileId]/test-cases` — should show test cases list
- `/eng/providers/[id]/[profileId]/pipeline` — should show pipeline sections

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(eng): resolve compilation issues in provider pages"
```
