# Playground UI — Plan 3a-3: Provider Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all provider-related pages including the eng layout with sidebar, provider registry, provider/profile creation, provider detail, and all profile tabs (overview, test cases, pipeline).

**Architecture:** Next.js App Router nested routes under `/eng/`. Follows the codebase's established data layer pattern: `src/data/eng/<domain>/shared.ts` (types + fetch functions + query keys), `server.ts` (React.cache wrappers), `client.ts` (React Query hooks via `createEngSuspenseHook`), and `actions/` (server actions with eng server client). Layouts are server components with zero async. Client components with `useSuspenseQuery` use `HydrationBoundary` with server-prefetched data. Auth is handled by middleware (Plan 3a-1) — the layout does NOT check auth.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, React Query

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plans 3a-1 (database & infrastructure), 3a-2 (shared components)
**Blocks:** Plan 3a-6 (code review)

**Frontend patterns:** This plan MUST follow `frontend-patterns` skill. Key rules:
- Data fetching in `src/data/eng/` using `createEngSuspenseHook` factory
- Server components for data fetching, client components for interactivity
- Layouts have ZERO async — no `await`, no `createClient()`, no DB queries
- `useSuspenseQuery` client components need `HydrationBoundary` server wrappers
- Component body ordering: refs → context → router → state → derived → queries → effects → callbacks → render helpers → return
- Every route gets `loading.tsx` returning `<PageLoader />`
- Pages wrap content in `<FadeIn className="h-full">`
- No React context for data — use React Query

---

## File Structure

```
src/data/eng/
  providers/
    shared.ts                      # Types, query keys, fetch functions for providers + profiles
    server.ts                      # React.cache() server fetchers
    client.ts                      # React Query hooks via createEngSuspenseHook
    actions/
      create-provider.ts           # Server action: create provider
      update-provider.ts           # Server action: update provider
      create-profile.ts            # Server action: create profile
      update-profile.ts            # Server action: update profile + audit log
      run-tests.ts                 # Server action: run test suite
      create-test-case.ts          # Server action: create test case
      update-test-case.ts          # Server action: update test case
      delete-test-case.ts          # Server action: delete test case
  badges/
    shared.ts                      # Sidebar badge count queries
    client.ts                      # React Query hook for badge counts

src/app/eng/
  layout.tsx                       # Server component: sidebar + QueryProvider (NO async)
  loading.tsx                      # PageLoader
  page.tsx                         # Redirect to /eng/providers
  providers/
    page.tsx                       # Server component: prefetch + HydrationBoundary
    loading.tsx
    new/
      page.tsx                     # Provider creation form
      loading.tsx
    [providerId]/
      page.tsx                     # Server component: prefetch provider detail
      loading.tsx
      new-profile/
        page.tsx                   # Profile creation form
        loading.tsx
      [profileId]/
        layout.tsx                 # Server component: profile tabs (NO async)
        overview/
          page.tsx                 # Server component: prefetch profile + HydrationBoundary
          loading.tsx
        test-cases/
          page.tsx                 # Server component: prefetch test cases
          loading.tsx
          [caseId]/
            page.tsx               # Server component: prefetch test case detail
            loading.tsx
        pipeline/
          page.tsx                 # Pipeline test lab
          loading.tsx

src/components/eng/
  sidebar.tsx                      # Client component: nav + badge counts via React Query
  provider-registry-table.tsx      # Client component: provider list
  provider-detail-client.tsx       # Client component: provider detail
  provider-form.tsx                # Client component: create provider form
  profile-form.tsx                 # Client component: create profile form
  profile-tabs.tsx                 # Client component: tab navigation
  profile-overview-client.tsx      # Client component: profile overview tab
  test-case-list-client.tsx        # Client component: test cases table
  test-case-detail-client.tsx      # Client component: test case detail
  pipeline-client.tsx              # Client component: pipeline test lab
  pipeline-section.tsx             # Client component: one pipeline section
  flag-for-fix-modal.tsx           # Client component: create fix request modal
```

---

### Task 1: Provider Data Layer — shared.ts

**Files:**
- Create: `src/data/eng/providers/shared.ts`

- [ ] **Step 1: Create provider types, query keys, and fetch functions**

```typescript
// src/data/eng/providers/shared.ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

// ─── Types ──────────────────────────────────────────────────────────

export interface ProviderListItem {
  id: string
  name: string
  displayName: string | null
  taxId: string | null
  countryCode: string
  profileCount: number
  categories: string[]
  weightedAccuracy: number | null
  lastTested: string | null
  derivedStatus: 'active' | 'draft' | 'deprecated'
}

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

export interface TestCaseListItem {
  id: string
  profileId: string
  competency: string
  description: string | null
  testBillId: string | null
  createdBy: string
  createdAt: string
  openFixCount: number
}

export interface TestCaseDetail {
  id: string
  profileId: string
  competency: string
  description: string | null
  testBillId: string | null
  sourceData: Record<string, any> | null
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

// ─── Query Keys ─────────────────────────────────────────────────────

export const providersQueryKey = () => ['eng', 'providers'] as const
export const providerDetailQueryKey = (id: string) => ['eng', 'provider', id] as const
export const profileDetailQueryKey = (id: string) => ['eng', 'profile', id] as const
export const testCasesQueryKey = (profileId: string) => ['eng', 'test-cases', profileId] as const
export const testCaseDetailQueryKey = (id: string) => ['eng', 'test-case', id] as const

// ─── Fetch Functions ────────────────────────────────────────────────

export async function fetchProviders(supabase: TypedSupabaseClient): Promise<ProviderListItem[]> {
  const { data, error } = await supabase
    .from('providers')
    .select(`
      id, name, display_name, tax_id, country_code,
      provider_invoice_profiles (
        id, category, status,
        test_runs ( accuracy, passed, created_at )
      )
    `)
    .order('name')

  if (error) throw new Error(`Failed to fetch providers: ${error.message}`)
  if (!data) return []

  return data.map((p) => {
    const profiles = (p.provider_invoice_profiles ?? []) as any[]
    const categories = [...new Set(profiles.map((pr) => pr.category).filter(Boolean))]
    const hasActive = profiles.some((pr) => pr.status === 'active')
    const allDeprecated = profiles.length > 0 && profiles.every((pr) => pr.status === 'deprecated')

    let totalWeight = 0
    let weightedSum = 0
    let lastTested: string | null = null

    for (const profile of profiles) {
      const runs = (profile.test_runs ?? []).sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      if (runs.length === 0) continue
      const latest = runs[0]
      const weight = runs.length
      totalWeight += weight
      weightedSum += (Number(latest.accuracy) ?? 0) * weight
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
      weightedAccuracy: totalWeight > 0 ? weightedSum / totalWeight : null,
      lastTested,
      derivedStatus: hasActive ? 'active' : allDeprecated ? 'deprecated' : 'draft',
    }
  })
}

export async function fetchProviderDetail(
  supabase: TypedSupabaseClient,
  providerId: string,
): Promise<ProviderDetail> {
  const { data, error } = await supabase
    .from('providers')
    .select(`
      *,
      company_cache (*),
      provider_invoice_profiles (
        id, name, region, category, status, capabilities,
        test_cases ( id ),
        test_runs ( accuracy, passed, created_at ),
        test_fix_requests ( id, status )
      )
    `)
    .eq('id', providerId)
    .single()

  if (error || !data) throw new Error('Provider not found')

  const profiles: ProfileListItem[] = ((data.provider_invoice_profiles ?? []) as any[]).map((p) => {
    const runs = (p.test_runs ?? []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const latest = runs[0]
    const openFixes = (p.test_fix_requests ?? []).filter((f: any) => f.status === 'open')

    return {
      id: p.id,
      name: p.name,
      region: p.region,
      category: p.category,
      status: p.status,
      capabilities: p.capabilities ?? {},
      accuracy: latest ? Number(latest.accuracy) : null,
      testCaseCount: (p.test_cases ?? []).length,
      lastTested: latest?.created_at ?? null,
      openFixCount: openFixes.length,
    }
  })

  const cc = (data as any).company_cache
  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name,
    taxId: data.tax_id,
    countryCode: data.country_code,
    phone: data.phone,
    website: data.website,
    logoUrl: data.logo_url,
    companyCache: cc
      ? {
          legalName: cc.legal_name,
          tradeName: cc.trade_name,
          activityCode: cc.activity_code,
          activityDescription: cc.activity_description,
          city: cc.city,
          state: cc.state,
          source: cc.source,
          fetchedAt: cc.fetched_at,
        }
      : null,
    profiles,
    openFixCount: profiles.reduce((sum, p) => sum + p.openFixCount, 0),
  }
}

export async function fetchProfileDetail(
  supabase: TypedSupabaseClient,
  profileId: string,
): Promise<ProfileDetail> {
  const { data, error } = await supabase
    .from('provider_invoice_profiles')
    .select(`
      *,
      test_cases ( id ),
      test_runs ( accuracy, passed, created_at ),
      test_fix_requests ( id, status )
    `)
    .eq('id', profileId)
    .single()

  if (error || !data) throw new Error('Profile not found')

  const runs = ((data as any).test_runs ?? []).sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const latest = runs[0]
  const openFixes = ((data as any).test_fix_requests ?? []).filter((f: any) => f.status === 'open')

  return {
    id: data.id,
    providerId: data.provider_id,
    name: data.name,
    region: data.region,
    category: data.category,
    status: data.status,
    capabilities: data.capabilities as Record<string, any>,
    aiNotes: data.ai_notes,
    minAccuracy: Number(data.min_accuracy),
    autoAcceptThreshold: Number(data.auto_accept_threshold),
    reviewThreshold: Number(data.review_threshold),
    testCaseCount: ((data as any).test_cases ?? []).length,
    openFixCount: openFixes.length,
    latestAccuracy: latest ? Number(latest.accuracy) : null,
    latestRunPassed: latest?.passed ?? null,
  }
}

export async function fetchTestCases(
  supabase: TypedSupabaseClient,
  profileId: string,
): Promise<TestCaseListItem[]> {
  const { data, error } = await supabase
    .from('test_cases')
    .select(`
      id, profile_id, competency, description, test_bill_id,
      created_by, created_at,
      test_fix_requests ( id, status )
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch test cases: ${error.message}`)

  return (data ?? []).map((tc: any) => ({
    id: tc.id,
    profileId: tc.profile_id,
    competency: tc.competency,
    description: tc.description,
    testBillId: tc.test_bill_id,
    createdBy: tc.created_by,
    createdAt: tc.created_at,
    openFixCount: (tc.test_fix_requests ?? []).filter((f: any) => f.status === 'open').length,
  }))
}

export async function fetchTestCaseDetail(
  supabase: TypedSupabaseClient,
  caseId: string,
): Promise<TestCaseDetail> {
  const { data, error } = await supabase
    .from('test_cases')
    .select(`
      *,
      test_fix_requests ( id, status, engineer_notes, created_at )
    `)
    .eq('id', caseId)
    .single()

  if (error || !data) throw new Error('Test case not found')

  return {
    id: data.id,
    profileId: data.profile_id,
    competency: data.competency,
    description: data.description,
    testBillId: data.test_bill_id,
    sourceData: data.source_data as Record<string, any> | null,
    expectedFields: data.expected_fields as Record<string, any>,
    createdBy: data.created_by,
    createdAt: data.created_at,
    fixRequests: ((data as any).test_fix_requests ?? []).map((f: any) => ({
      id: f.id,
      status: f.status,
      engineerNotes: f.engineer_notes,
      createdAt: f.created_at,
    })),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/eng/providers/shared.ts
git commit -m "feat(eng): add provider data layer types, query keys, and fetch functions"
```

---

### Task 2: Provider Data Layer — server.ts

**Files:**
- Create: `src/data/eng/providers/server.ts`

- [ ] **Step 1: Create server fetchers with React.cache()**

```typescript
// src/data/eng/providers/server.ts
import { cache } from 'react'
import { createEngServerClient } from '@/lib/supabase/eng-client'
import {
  fetchProviders,
  fetchProviderDetail,
  fetchProfileDetail,
  fetchTestCases,
  fetchTestCaseDetail,
} from './shared'
import type {
  ProviderListItem,
  ProviderDetail,
  ProfileDetail,
  TestCaseListItem,
  TestCaseDetail,
} from './shared'

export const getProviders = cache(async (): Promise<ProviderListItem[]> => {
  const supabase = await createEngServerClient()
  return fetchProviders(supabase)
})

export const getProviderDetail = cache(async (providerId: string): Promise<ProviderDetail> => {
  const supabase = await createEngServerClient()
  return fetchProviderDetail(supabase, providerId)
})

export const getProfileDetail = cache(async (profileId: string): Promise<ProfileDetail> => {
  const supabase = await createEngServerClient()
  return fetchProfileDetail(supabase, profileId)
})

export const getTestCases = cache(async (profileId: string): Promise<TestCaseListItem[]> => {
  const supabase = await createEngServerClient()
  return fetchTestCases(supabase, profileId)
})

export const getTestCaseDetail = cache(async (caseId: string): Promise<TestCaseDetail> => {
  const supabase = await createEngServerClient()
  return fetchTestCaseDetail(supabase, caseId)
})
```

- [ ] **Step 2: Commit**

```bash
git add src/data/eng/providers/server.ts
git commit -m "feat(eng): add provider server fetchers with React.cache()"
```

---

### Task 3: Provider Data Layer — client.ts

**Files:**
- Create: `src/data/eng/providers/client.ts`

- [ ] **Step 1: Create React Query hooks**

```typescript
// src/data/eng/providers/client.ts
'use client'

import { createEngSuspenseHook } from '../shared/create-eng-hook'
import {
  fetchProviders,
  fetchProviderDetail,
  fetchProfileDetail,
  fetchTestCases,
  fetchTestCaseDetail,
  providersQueryKey,
  providerDetailQueryKey,
  profileDetailQueryKey,
  testCasesQueryKey,
  testCaseDetailQueryKey,
} from './shared'
import type {
  ProviderListItem,
  ProviderDetail,
  ProfileDetail,
  TestCaseListItem,
  TestCaseDetail,
} from './shared'

export const useProviders = createEngSuspenseHook<ProviderListItem[], []>(
  providersQueryKey,
  fetchProviders,
)

export const useProviderDetail = createEngSuspenseHook<ProviderDetail, [string]>(
  providerDetailQueryKey,
  fetchProviderDetail,
)

export const useProfileDetail = createEngSuspenseHook<ProfileDetail, [string]>(
  profileDetailQueryKey,
  fetchProfileDetail,
)

export const useTestCases = createEngSuspenseHook<TestCaseListItem[], [string]>(
  testCasesQueryKey,
  fetchTestCases,
)

export const useTestCaseDetail = createEngSuspenseHook<TestCaseDetail, [string]>(
  testCaseDetailQueryKey,
  fetchTestCaseDetail,
)

export type {
  ProviderListItem,
  ProviderDetail,
  ProfileDetail,
  TestCaseListItem,
  TestCaseDetail,
} from './shared'
```

- [ ] **Step 2: Commit**

```bash
git add src/data/eng/providers/client.ts
git commit -m "feat(eng): add provider React Query hooks via createEngSuspenseHook"
```

---

### Task 4: Sidebar Badge Data Layer

**Files:**
- Create: `src/data/eng/badges/shared.ts`
- Create: `src/data/eng/badges/client.ts`

- [ ] **Step 1: Create badge count types and fetch**

```typescript
// src/data/eng/badges/shared.ts
import type { TypedSupabaseClient } from '@/lib/supabase/types'

export interface BadgeCounts {
  pendingRequests: number
  openFixes: number
  failingProfiles: number
}

export const badgeCountsQueryKey = () => ['eng', 'badge-counts'] as const

export async function fetchBadgeCounts(supabase: TypedSupabaseClient): Promise<BadgeCounts> {
  const [reqRes, fixRes] = await Promise.all([
    supabase
      .from('provider_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('test_fix_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
  ])

  // For failing profiles: get latest test run per active profile
  const { data: runs } = await supabase
    .from('test_runs')
    .select('profile_id, passed, created_at')
    .order('created_at', { ascending: false })

  // Group by profile_id, take latest, count where passed = false
  const latestByProfile = new Map<string, boolean>()
  for (const run of runs ?? []) {
    if (!latestByProfile.has(run.profile_id)) {
      latestByProfile.set(run.profile_id, run.passed)
    }
  }
  const failingProfiles = [...latestByProfile.values()].filter((passed) => !passed).length

  return {
    pendingRequests: reqRes.count ?? 0,
    openFixes: fixRes.count ?? 0,
    failingProfiles,
  }
}
```

```typescript
// src/data/eng/badges/client.ts
'use client'

import { createEngSuspenseHook } from '../shared/create-eng-hook'
import { fetchBadgeCounts, badgeCountsQueryKey } from './shared'
import type { BadgeCounts } from './shared'

export const useBadgeCounts = createEngSuspenseHook<BadgeCounts, []>(
  badgeCountsQueryKey,
  fetchBadgeCounts,
)

export type { BadgeCounts } from './shared'
```

- [ ] **Step 2: Commit**

```bash
git add src/data/eng/badges/shared.ts src/data/eng/badges/client.ts
git commit -m "feat(eng): add sidebar badge counts data layer"
```

---

### Task 5: Provider Server Actions

**Files:**
- Create: `src/data/eng/providers/actions/create-provider.ts`
- Create: `src/data/eng/providers/actions/update-provider.ts`
- Create: `src/data/eng/providers/actions/create-profile.ts`
- Create: `src/data/eng/providers/actions/update-profile.ts`

- [ ] **Step 1: Create provider server actions**

```typescript
// src/data/eng/providers/actions/create-provider.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export interface CreateProviderState {
  success: boolean
  providerId?: string
  errors?: { general?: string }
}

export async function createProvider(
  _prevState: CreateProviderState,
  formData: FormData,
): Promise<CreateProviderState> {
  const supabase = await createEngServerClient()

  const name = formData.get('name') as string
  const displayName = formData.get('displayName') as string
  const taxId = formData.get('taxId') as string | null
  const countryCode = (formData.get('countryCode') as string) || 'BR'
  const phone = formData.get('phone') as string | null
  const website = formData.get('website') as string | null

  if (!name) return { success: false, errors: { general: 'Name is required' } }

  // Link to company_cache if tax ID provided
  let companyCacheId: string | null = null
  if (taxId) {
    const cleanTaxId = taxId.replace(/[.\-/]/g, '')
    const { data: cached } = await supabase
      .from('company_cache')
      .select('id')
      .eq('tax_id', cleanTaxId)
      .single()
    companyCacheId = cached?.id ?? null
  }

  const { data, error } = await supabase
    .from('providers')
    .insert({
      name,
      display_name: displayName || name,
      tax_id: taxId?.replace(/[.\-/]/g, '') ?? null,
      country_code: countryCode,
      phone: phone || null,
      website: website || null,
      company_cache_id: companyCacheId,
    })
    .select('id')
    .single()

  if (error) return { success: false, errors: { general: error.message } }

  revalidatePath('/eng/providers')
  return { success: true, providerId: data.id }
}
```

```typescript
// src/data/eng/providers/actions/update-provider.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export async function updateProvider(
  providerId: string,
  updates: {
    name?: string
    displayName?: string
    phone?: string | null
    website?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createEngServerClient()

  const dbUpdates: Record<string, any> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone
  if (updates.website !== undefined) dbUpdates.website = updates.website

  const { error } = await supabase
    .from('providers')
    .update(dbUpdates)
    .eq('id', providerId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/eng/providers/${providerId}`)
  return { success: true }
}
```

```typescript
// src/data/eng/providers/actions/create-profile.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export interface CreateProfileState {
  success: boolean
  profileId?: string
  errors?: { general?: string }
}

export async function createProfile(
  _prevState: CreateProfileState,
  formData: FormData,
): Promise<CreateProfileState> {
  const supabase = await createEngServerClient()

  const providerId = formData.get('providerId') as string
  const name = formData.get('name') as string
  const region = formData.get('region') as string | null
  const category = formData.get('category') as string
  const aiNotes = formData.get('aiNotes') as string | null
  const minAccuracy = Number(formData.get('minAccuracy') || 0.95)
  const autoAcceptThreshold = Number(formData.get('autoAcceptThreshold') || 0.90)
  const reviewThreshold = Number(formData.get('reviewThreshold') || 0.50)

  if (!name) return { success: false, errors: { general: 'Display name is required' } }
  if (!providerId) return { success: false, errors: { general: 'Provider ID is required' } }

  const { data, error } = await supabase
    .from('provider_invoice_profiles')
    .insert({
      provider_id: providerId,
      name,
      region: region || null,
      category,
      ai_notes: aiNotes || null,
      min_accuracy: minAccuracy,
      auto_accept_threshold: autoAcceptThreshold,
      review_threshold: reviewThreshold,
      status: 'draft',
      capabilities: { extraction: true },
      parser_strategy: 'custom',
      extraction_config: {},
      validation_config: {},
    })
    .select('id')
    .single()

  if (error) return { success: false, errors: { general: error.message } }

  revalidatePath(`/eng/providers/${providerId}`)
  return { success: true, profileId: data.id }
}
```

```typescript
// src/data/eng/providers/actions/update-profile.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export async function updateProfile(
  profileId: string,
  updates: {
    name?: string
    region?: string | null
    category?: string
    status?: string
    aiNotes?: string | null
    minAccuracy?: number
    autoAcceptThreshold?: number
    reviewThreshold?: number
  },
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUpdates: Record<string, any> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.region !== undefined) dbUpdates.region = updates.region
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.aiNotes !== undefined) dbUpdates.ai_notes = updates.aiNotes
  if (updates.minAccuracy !== undefined) dbUpdates.min_accuracy = updates.minAccuracy
  if (updates.autoAcceptThreshold !== undefined) dbUpdates.auto_accept_threshold = updates.autoAcceptThreshold
  if (updates.reviewThreshold !== undefined) dbUpdates.review_threshold = updates.reviewThreshold

  // Log threshold changes to audit_log
  const thresholdKeys = ['minAccuracy', 'autoAcceptThreshold', 'reviewThreshold'] as const
  const thresholdChanges = thresholdKeys.filter((k) => updates[k] !== undefined)

  if (thresholdChanges.length > 0 && reason && user) {
    const { data: current } = await supabase
      .from('provider_invoice_profiles')
      .select('min_accuracy, auto_accept_threshold, review_threshold')
      .eq('id', profileId)
      .single()

    if (current) {
      const snakeMap: Record<string, string> = {
        minAccuracy: 'min_accuracy',
        autoAcceptThreshold: 'auto_accept_threshold',
        reviewThreshold: 'review_threshold',
      }
      for (const field of thresholdChanges) {
        const snake = snakeMap[field]
        await supabase.from('audit_log').insert({
          entity_type: 'profile',
          entity_id: profileId,
          action: 'threshold_updated',
          old_value: { field: snake, value: current[snake as keyof typeof current] },
          new_value: { field: snake, value: updates[field], reason },
          changed_by: user.id,
        })
      }
    }
  }

  // Log status changes
  if (updates.status !== undefined && user) {
    const { data: current } = await supabase
      .from('provider_invoice_profiles')
      .select('status')
      .eq('id', profileId)
      .single()

    if (current && current.status !== updates.status) {
      await supabase.from('audit_log').insert({
        entity_type: 'profile',
        entity_id: profileId,
        action: 'status_change',
        old_value: { status: current.status },
        new_value: { status: updates.status },
        changed_by: user.id,
      })
    }
  }

  const { error } = await supabase
    .from('provider_invoice_profiles')
    .update(dbUpdates)
    .eq('id', profileId)

  if (error) return { success: false, error: error.message }

  // Get provider_id for revalidation path
  const { data: profile } = await supabase
    .from('provider_invoice_profiles')
    .select('provider_id')
    .eq('id', profileId)
    .single()

  if (profile) {
    revalidatePath(`/eng/providers/${profile.provider_id}/${profileId}`)
  }
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/eng/providers/actions/
git commit -m "feat(eng): add provider and profile server actions"
```

---

### Task 6: Test Case Server Actions

**Files:**
- Create: `src/data/eng/providers/actions/create-test-case.ts`
- Create: `src/data/eng/providers/actions/update-test-case.ts`
- Create: `src/data/eng/providers/actions/delete-test-case.ts`
- Create: `src/data/eng/providers/actions/create-fix-request.ts`

- [ ] **Step 1: Create test case and fix request actions**

```typescript
// src/data/eng/providers/actions/create-test-case.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export async function createTestCase(data: {
  profileId: string
  competency: string
  description: string | null
  testBillId: string | null
  sourceData: Record<string, any> | null
  expectedFields: Record<string, any>
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createEngServerClient()

  const { data: result, error } = await supabase
    .from('test_cases')
    .insert({
      profile_id: data.profileId,
      competency: data.competency,
      description: data.description,
      test_bill_id: data.testBillId,
      source_data: data.sourceData,
      expected_fields: data.expectedFields,
      created_by: 'engineer',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(`/eng`)
  return { success: true, id: result.id }
}
```

```typescript
// src/data/eng/providers/actions/update-test-case.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export async function updateTestCase(
  caseId: string,
  updates: {
    description?: string
    expectedFields?: Record<string, any>
    sourceData?: Record<string, any> | null
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createEngServerClient()

  const dbUpdates: Record<string, any> = {}
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.expectedFields !== undefined) dbUpdates.expected_fields = updates.expectedFields
  if (updates.sourceData !== undefined) dbUpdates.source_data = updates.sourceData

  const { error } = await supabase
    .from('test_cases')
    .update(dbUpdates)
    .eq('id', caseId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/eng')
  return { success: true }
}
```

```typescript
// src/data/eng/providers/actions/delete-test-case.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export async function deleteTestCase(
  caseId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createEngServerClient()

  const { error } = await supabase
    .from('test_cases')
    .delete()
    .eq('id', caseId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/eng')
  return { success: true }
}
```

```typescript
// src/data/eng/providers/actions/create-fix-request.ts
'use server'

import { createEngServerClient } from '@/lib/supabase/eng-client'
import { revalidatePath } from 'next/cache'

export async function createFixRequest(data: {
  profileId: string
  competency: string
  testCaseId?: string
  testRunId?: string
  providerRequestId?: string
  sourceData?: Record<string, any>
  actualResult: Record<string, any>
  expectedResult?: Record<string, any>
  rawExternal?: Record<string, any>
  engineerNotes: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createEngServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: result, error } = await supabase
    .from('test_fix_requests')
    .insert({
      profile_id: data.profileId,
      test_case_id: data.testCaseId ?? null,
      test_run_id: data.testRunId ?? null,
      provider_request_id: data.providerRequestId ?? null,
      competency: data.competency,
      source_data: data.sourceData ?? null,
      actual_result: data.actualResult,
      expected_result: data.expectedResult ?? null,
      raw_external: data.rawExternal ?? null,
      engineer_notes: data.engineerNotes,
      status: 'open',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/eng/fixes')
  return { success: true, id: result.id }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/eng/providers/actions/
git commit -m "feat(eng): add test case CRUD and fix request server actions"
```

---

### Task 7: Eng Layout and Sidebar

**Files:**
- Create: `src/components/eng/sidebar.tsx`
- Create: `src/app/eng/layout.tsx`
- Create: `src/app/eng/loading.tsx`
- Create: `src/app/eng/page.tsx`

The layout is a server component with ZERO async. Auth is handled by middleware. The sidebar is a client component that uses React Query for badge counts.

- [ ] **Step 1: Create the sidebar client component**

```typescript
// src/components/eng/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Building2,
  Inbox,
  Wrench,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useBadgeCounts } from '@/data/eng/badges/client'

const navItems = [
  { label: 'Providers', href: '/eng/providers', icon: Building2, badgeKey: null },
  { label: 'Requests', href: '/eng/requests', icon: Inbox, badgeKey: 'pendingRequests' as const },
  { label: 'Fixes', href: '/eng/fixes', icon: Wrench, badgeKey: 'openFixes' as const },
  { label: 'Accuracy', href: '/eng/accuracy', icon: BarChart3, badgeKey: 'failingProfiles' as const },
  { label: 'Discovery', href: '/eng/discovery', icon: Search, badgeKey: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { data: badges } = useBadgeCounts()

  return (
    <aside
      className={`flex flex-col border-r bg-muted/30 transition-all ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        {!collapsed && (
          <span className="text-sm font-semibold text-muted-foreground">Engineering</span>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="rounded p-1 hover:bg-muted">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0

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

- [ ] **Step 2: Create the eng layout (server component, NO async)**

```typescript
// src/app/eng/layout.tsx
import { Sidebar } from '@/components/eng/sidebar'
import { QueryProvider } from '@/components/query-provider'
import { Suspense } from 'react'

export default function EngLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex h-screen">
        <Suspense fallback={<div className="w-56 border-r bg-muted/30" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </QueryProvider>
  )
}
```

- [ ] **Step 3: Create loading.tsx and redirect page**

```typescript
// src/app/eng/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

```typescript
// src/app/eng/page.tsx
import { redirect } from 'next/navigation'
export default function EngPage() { redirect('/eng/providers') }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/eng/sidebar.tsx src/app/eng/layout.tsx src/app/eng/loading.tsx src/app/eng/page.tsx
git commit -m "feat(eng): add eng layout with sidebar and React Query badge counts"
```

---

### Task 8: Provider Registry Page

**Files:**
- Create: `src/components/eng/provider-registry-table.tsx`
- Create: `src/app/eng/providers/page.tsx`
- Create: `src/app/eng/providers/loading.tsx`

- [ ] **Step 1: Create the registry table client component**

```typescript
// src/components/eng/provider-registry-table.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import { Sparkline } from '@/components/eng/sparkline'
import { useProviders, type ProviderListItem } from '@/data/eng/providers/client'

export function ProviderRegistryTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const { data: providers } = useProviders()

  const filtered = providers
    .filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        (p.displayName ?? p.name).toLowerCase().includes(q) ||
        p.taxId?.includes(q)
      )
    })
    .filter((p) => !statusFilter || p.derivedStatus === statusFilter)
    .sort((a, b) => {
      // Failing first, near-threshold, healthy
      const score = (v: number | null) => (v === null ? 1 : v < 0.95 ? 0 : 2)
      const diff = score(a.weightedAccuracy) - score(b.weightedAccuracy)
      if (diff !== 0) return diff
      return (a.weightedAccuracy ?? 0) - (b.weightedAccuracy ?? 0)
    })

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

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground bg-muted/30">
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Tax ID</th>
              <th className="px-4 py-3 font-medium">Profiles</th>
              <th className="px-4 py-3 font-medium">Categories</th>
              <th className="px-4 py-3 font-medium">Accuracy</th>
              <th className="px-4 py-3 font-medium">Last Tested</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/eng/providers/${p.id}`)}
              >
                <td className="px-4 py-3 font-medium">{p.displayName ?? p.name}</td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.taxId ?? '—'}</td>
                <td className="px-4 py-3">{p.profileCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.categories.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.weightedAccuracy !== null ? (
                    <div className="flex items-center gap-2">
                      <ThresholdBadge value={p.weightedAccuracy} threshold={0.95} format="percent" />
                      <Sparkline data={[]} threshold={0.95} />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.lastTested ? new Date(p.lastTested).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No providers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the registry server page with HydrationBoundary**

```typescript
// src/app/eng/providers/page.tsx
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProviders } from '@/data/eng/providers/server'
import { providersQueryKey } from '@/data/eng/providers/shared'
import { ProviderRegistryTable } from '@/components/eng/provider-registry-table'
import { FadeIn } from '@/components/fade-in'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ProvidersPage() {
  const queryClient = new QueryClient()
  const providers = await getProviders()
  queryClient.setQueryData(providersQueryKey(), providers)

  return (
    <FadeIn className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Providers</h1>
          <Link href="/eng/providers/new">
            <Button><Plus className="h-4 w-4" /> New Provider</Button>
          </Link>
        </div>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProviderRegistryTable />
        </HydrationBoundary>
      </div>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/provider-registry-table.tsx src/app/eng/providers/page.tsx src/app/eng/providers/loading.tsx
git commit -m "feat(eng): add provider registry page with HydrationBoundary"
```

---

### Task 9: Provider Creation Page

**Files:**
- Create: `src/components/eng/provider-form.tsx`
- Create: `src/app/eng/providers/new/page.tsx`
- Create: `src/app/eng/providers/new/loading.tsx`

- [ ] **Step 1: Create the provider form client component**

```typescript
// src/components/eng/provider-form.tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { createProvider, type CreateProviderState } from '@/data/eng/providers/actions/create-provider'

export function ProviderForm() {
  const router = useRouter()
  const [lookupDone, setLookupDone] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [taxId, setTaxId] = useState('')
  const [prefilled, setPrefilled] = useState<{ name: string; displayName: string } | null>(null)

  const [state, formAction, isPending] = useActionState<CreateProviderState, FormData>(
    createProvider,
    { success: false },
  )

  useEffect(() => {
    if (state.success && state.providerId) {
      router.push(`/eng/providers/${state.providerId}`)
    }
  }, [state, router])

  const handleLookup = async () => {
    if (!taxId.trim()) return
    setLookingUp(true)
    try {
      // Use the CNPJ lookup API
      const res = await fetch(`/api/eng/cnpj-lookup?taxId=${encodeURIComponent(taxId)}`)
      if (res.ok) {
        const data = await res.json()
        setPrefilled({ name: data.companyName, displayName: data.companyName })
      }
      setLookupDone(true)
    } catch {
      setLookupDone(true)
    }
    setLookingUp(false)
  }

  const fieldsDisabled = !lookupDone

  return (
    <Card className="max-w-lg p-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label>Tax ID</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter tax ID (e.g., CNPJ)"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
            <input type="hidden" name="taxId" value={taxId} />
            <Button type="button" onClick={handleLookup} disabled={lookingUp || !taxId.trim()} variant="secondary">
              {lookingUp ? 'Looking up...' : 'Lookup'}
            </Button>
          </div>
        </div>

        <fieldset disabled={fieldsDisabled || isPending} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input name="name" defaultValue={prefilled?.name ?? ''} />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input name="displayName" defaultValue={prefilled?.displayName ?? ''} />
          </div>
          <div className="space-y-2">
            <Label>Country Code</Label>
            <Input name="countryCode" defaultValue="BR" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="phone" />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input name="website" />
          </div>

          {state.errors?.general && (
            <p className="text-sm text-destructive">{state.errors.general}</p>
          )}

          <Button type="submit" loading={isPending} className="w-full">
            Create Provider
          </Button>
        </fieldset>
      </form>
    </Card>
  )
}
```

- [ ] **Step 2: Create the page and loading**

```typescript
// src/app/eng/providers/new/page.tsx
import { FadeIn } from '@/components/fade-in'
import { ProviderForm } from '@/components/eng/provider-form'

export default function NewProviderPage() {
  return (
    <FadeIn className="h-full">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">New Provider</h1>
        <p className="text-muted-foreground">
          Enter a tax ID to look up company information, or upload a bill to extract it.
        </p>
        <ProviderForm />
      </div>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/new/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/provider-form.tsx src/app/eng/providers/new/page.tsx src/app/eng/providers/new/loading.tsx
git commit -m "feat(eng): add provider creation page with useActionState"
```

---

### Task 10: Provider Detail Page

**Files:**
- Create: `src/components/eng/provider-detail-client.tsx`
- Create: `src/app/eng/providers/[providerId]/page.tsx`
- Create: `src/app/eng/providers/[providerId]/loading.tsx`

- [ ] **Step 1: Create the provider detail client component**

```typescript
// src/components/eng/provider-detail-client.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThresholdBadge } from '@/components/eng/threshold-badge'
import { Sparkline } from '@/components/eng/sparkline'
import { EmptyState } from '@/components/eng/empty-state'
import { useProviderDetail } from '@/data/eng/providers/client'
import { Plus, Building2, Wrench } from 'lucide-react'
import Link from 'next/link'

export function ProviderDetailClient({ providerId }: { providerId: string }) {
  const router = useRouter()
  const { data: provider } = useProviderDetail(providerId)

  const hasActive = provider.profiles.some((p) => p.status === 'active')
  const allDeprecated = provider.profiles.length > 0 && provider.profiles.every((p) => p.status === 'deprecated')
  const derivedStatus = hasActive ? 'active' : allDeprecated ? 'deprecated' : 'draft'
  const categories = [...new Set(provider.profiles.map((p) => p.category).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{provider.displayName ?? provider.name}</h1>
          {provider.taxId && (
            <p className="text-sm text-muted-foreground font-mono mt-1">{provider.taxId}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={derivedStatus === 'active' ? 'default' : 'secondary'}>{derivedStatus}</Badge>
          {provider.openFixCount > 0 && (
            <Link href="/eng/fixes">
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
            </div>
          </details>
        )}
      </Card>

      {/* Profiles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Profiles</h2>
          <Link href={`/eng/providers/${providerId}/new-profile`}>
            <Button size="sm"><Plus className="h-4 w-4" /> New Profile</Button>
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
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/30">
                  <th className="px-4 py-3 font-medium">Profile</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Capabilities</th>
                  <th className="px-4 py-3 font-medium">Accuracy</th>
                  <th className="px-4 py-3 font-medium">Tests</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {provider.profiles.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/eng/providers/${providerId}/${p.id}/overview`)}
                  >
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.region ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.category ? <Badge variant="outline" className="text-xs">{p.category}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {p.capabilities.extraction && <Badge variant="outline" className="text-xs">extraction</Badge>}
                        {p.capabilities.validation && <Badge variant="outline" className="text-xs">validation</Badge>}
                        {p.capabilities.paymentStatus && <Badge variant="outline" className="text-xs">payment</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.accuracy !== null ? (
                        <div className="flex items-center gap-2">
                          <ThresholdBadge value={p.accuracy} threshold={0.95} format="percent" />
                          <Sparkline data={[]} threshold={0.95} />
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{p.testCaseCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the server page with HydrationBoundary**

```typescript
// src/app/eng/providers/[providerId]/page.tsx
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProviderDetail } from '@/data/eng/providers/server'
import { providerDetailQueryKey } from '@/data/eng/providers/shared'
import { ProviderDetailClient } from '@/components/eng/provider-detail-client'
import { FadeIn } from '@/components/fade-in'

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ providerId: string }>
}) {
  const { providerId } = await params
  const queryClient = new QueryClient()
  const provider = await getProviderDetail(providerId)
  queryClient.setQueryData(providerDetailQueryKey(providerId), provider)

  return (
    <FadeIn className="h-full">
      <div className="p-6">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProviderDetailClient providerId={providerId} />
        </HydrationBoundary>
      </div>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/provider-detail-client.tsx src/app/eng/providers/\[providerId\]/page.tsx src/app/eng/providers/\[providerId\]/loading.tsx
git commit -m "feat(eng): add provider detail page with HydrationBoundary"
```

---

### Task 11: Profile Creation Page

**Files:**
- Create: `src/components/eng/profile-form.tsx`
- Create: `src/app/eng/providers/[providerId]/new-profile/page.tsx`
- Create: `src/app/eng/providers/[providerId]/new-profile/loading.tsx`

- [ ] **Step 1: Create the profile form**

```typescript
// src/components/eng/profile-form.tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { createProfile, type CreateProfileState } from '@/data/eng/providers/actions/create-profile'

export function ProfileForm({ providerId }: { providerId: string }) {
  const router = useRouter()

  const [state, formAction, isPending] = useActionState<CreateProfileState, FormData>(
    createProfile,
    { success: false },
  )

  useEffect(() => {
    if (state.success && state.profileId) {
      router.push(`/eng/providers/${providerId}/${state.profileId}/overview`)
    }
  }, [state, router, providerId])

  return (
    <Card className="max-w-lg p-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="providerId" value={providerId} />

        <fieldset disabled={isPending} className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input name="name" placeholder="e.g., Enliv (Campeche)" required />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <Input name="region" placeholder="e.g., SC-florianopolis-campeche" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <select name="category" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue="electricity">
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
              name="aiNotes"
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]"
              placeholder="Context for Claude: API info, scraping targets, bill format notes, vault secret references..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Min Accuracy</Label>
              <Input type="number" name="minAccuracy" step="0.01" min="0" max="1" defaultValue="0.95" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Auto Accept</Label>
              <Input type="number" name="autoAcceptThreshold" step="0.01" min="0" max="1" defaultValue="0.90" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Review</Label>
              <Input type="number" name="reviewThreshold" step="0.01" min="0" max="1" defaultValue="0.50" />
            </div>
          </div>

          {state.errors?.general && (
            <p className="text-sm text-destructive">{state.errors.general}</p>
          )}

          <Button type="submit" loading={isPending} className="w-full">
            Create Profile
          </Button>
        </fieldset>
      </form>
    </Card>
  )
}
```

- [ ] **Step 2: Create page and loading**

```typescript
// src/app/eng/providers/[providerId]/new-profile/page.tsx
import { FadeIn } from '@/components/fade-in'
import { ProfileForm } from '@/components/eng/profile-form'

export default async function NewProfilePage({
  params,
}: {
  params: Promise<{ providerId: string }>
}) {
  const { providerId } = await params
  return (
    <FadeIn className="h-full">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">New Profile</h1>
        <p className="text-muted-foreground">
          Create a new bill format profile for this provider. Starts in draft status.
        </p>
        <ProfileForm providerId={providerId} />
      </div>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/new-profile/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/profile-form.tsx src/app/eng/providers/\[providerId\]/new-profile/page.tsx src/app/eng/providers/\[providerId\]/new-profile/loading.tsx
git commit -m "feat(eng): add profile creation page with useActionState"
```

---

### Task 12: Profile Tabs Layout

**Files:**
- Create: `src/components/eng/profile-tabs.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/layout.tsx`

The profile layout is a server component with NO async.

- [ ] **Step 1: Create tab navigation and layout**

```typescript
// src/components/eng/profile-tabs.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', segment: 'overview' },
  { label: 'Test Cases', segment: 'test-cases' },
  { label: 'Pipeline', segment: 'pipeline' },
]

export function ProfileTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname()

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

```typescript
// src/app/eng/providers/[providerId]/[profileId]/layout.tsx
import { ProfileTabs } from '@/components/eng/profile-tabs'

export default function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { providerId: string; profileId: string }
}) {
  const basePath = `/eng/providers/${params.providerId}/${params.profileId}`

  return (
    <div>
      <div className="px-6 pt-4 pb-0 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/eng/providers">Providers</Link>
          <span>/</span>
          <Link href={`/eng/providers/${params.providerId}`}>Provider</Link>
          <span>/</span>
          <span className="text-foreground">Profile</span>
        </div>
      </div>
      <ProfileTabs basePath={basePath} />
      <div className="p-6">{children}</div>
    </div>
  )
}
```

Note: This layout accesses `params` synchronously (not awaited) since it's a server component layout with NO async — params in Next.js 15 layouts can be accessed directly from the props without await when the layout itself is not async.

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/profile-tabs.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/layout.tsx
git commit -m "feat(eng): add profile tabs layout (server component, no async)"
```

---

### Task 13: Profile Overview Tab

**Files:**
- Create: `src/components/eng/profile-overview-client.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/overview/page.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/overview/loading.tsx`

- [ ] **Step 1: Create the profile overview client component**

This component uses `useSuspenseQuery` via `useProfileDetail` — it will be wrapped in `HydrationBoundary` by the server page.

```typescript
// src/components/eng/profile-overview-client.tsx
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ThresholdManagement } from '@/components/eng/threshold-management'
import { TrendChart } from '@/components/eng/trend-chart'
import { useProfileDetail, type ProfileDetail } from '@/data/eng/providers/client'
import { profileDetailQueryKey } from '@/data/eng/providers/shared'
import { updateProfile } from '@/data/eng/providers/actions/update-profile'
import { Info } from 'lucide-react'

export function ProfileOverviewClient({ profileId }: { profileId: string }) {
  const queryClient = useQueryClient()
  const { data: profile } = useProfileDetail(profileId)

  const canPromote =
    profile.status === 'draft' &&
    profile.latestAccuracy !== null &&
    profile.latestAccuracy >= profile.minAccuracy

  const handleStatusChange = async (newStatus: string) => {
    await updateProfile(profileId, { status: newStatus })
    queryClient.invalidateQueries({ queryKey: profileDetailQueryKey(profileId) })
  }

  const handleThresholdSave = async (
    thresholds: { minAccuracy?: number; autoAcceptThreshold?: number; reviewThreshold?: number },
    reason: string,
  ) => {
    await updateProfile(profileId, thresholds, reason)
    queryClient.invalidateQueries({ queryKey: profileDetailQueryKey(profileId) })
  }

  const handleNotesChange = async (aiNotes: string) => {
    await updateProfile(profileId, { aiNotes })
    queryClient.invalidateQueries({ queryKey: profileDetailQueryKey(profileId) })
  }

  return (
    <div className="space-y-6">
      {/* Below threshold banner */}
      {profile.status === 'active' && profile.latestAccuracy !== null && profile.latestAccuracy < profile.minAccuracy && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          Accuracy has dropped below minimum threshold ({(profile.minAccuracy * 100).toFixed(0)}%).
          Current: {(profile.latestAccuracy * 100).toFixed(1)}%.
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

        <div className="flex gap-2 pt-2">
          {profile.status === 'draft' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" onClick={() => handleStatusChange('active')} disabled={!canPromote}>
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
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('deprecated')}>
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
        <p className="text-xs text-muted-foreground">Read-only — updated by AI when capabilities are implemented.</p>
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
          defaultValue={profile.aiNotes ?? ''}
          onBlur={(e) => handleNotesChange(e.target.value)}
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
        onSave={handleThresholdSave}
      />

      {/* Accuracy Trend */}
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Accuracy Trend</h2>
        <TrendChart data={[]} threshold={profile.minAccuracy} annotations={[]} />
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create server page with HydrationBoundary**

```typescript
// src/app/eng/providers/[providerId]/[profileId]/overview/page.tsx
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProfileDetail } from '@/data/eng/providers/server'
import { profileDetailQueryKey } from '@/data/eng/providers/shared'
import { ProfileOverviewClient } from '@/components/eng/profile-overview-client'
import { FadeIn } from '@/components/fade-in'

export default async function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { profileId } = await params
  const queryClient = new QueryClient()
  const profile = await getProfileDetail(profileId)
  queryClient.setQueryData(profileDetailQueryKey(profileId), profile)

  return (
    <FadeIn>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProfileOverviewClient profileId={profileId} />
      </HydrationBoundary>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/overview/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/profile-overview-client.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/overview/page.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/overview/loading.tsx
git commit -m "feat(eng): add profile overview tab with thresholds, capabilities, and notes"
```

---

### Task 14: Test Cases Tab — List and Detail

**Files:**
- Create: `src/components/eng/test-case-list-client.tsx`
- Create: `src/components/eng/test-case-detail-client.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/test-cases/page.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/test-cases/loading.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/test-cases/[caseId]/page.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/test-cases/[caseId]/loading.tsx`

- [ ] **Step 1: Create test case list client component**

```typescript
// src/components/eng/test-case-list-client.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useTestCases } from '@/data/eng/providers/client'
import { Wrench } from 'lucide-react'

export function TestCaseListClient({
  providerId,
  profileId,
}: {
  providerId: string
  profileId: string
}) {
  const router = useRouter()
  const [competencyFilter, setCompetencyFilter] = useState<string | null>(null)
  const { data: testCases } = useTestCases(profileId)

  const filtered = competencyFilter
    ? testCases.filter((tc) => tc.competency === competencyFilter)
    : testCases

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

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground bg-muted/30">
              <th className="px-4 py-3 font-medium">Competency</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Fixes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((tc) => (
              <tr
                key={tc.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/eng/providers/${providerId}/${profileId}/test-cases/${tc.id}`)}
              >
                <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{tc.competency}</Badge></td>
                <td className="px-4 py-3">{tc.description ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{tc.testBillId ? 'Bill PDF' : 'Source data'}</td>
                <td className="px-4 py-3 text-muted-foreground">{tc.createdBy}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(tc.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {tc.openFixCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Wrench className="h-3.5 w-3.5" />
                      <span className="text-xs">{tc.openFixCount}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No test cases found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create test case detail client component**

```typescript
// src/components/eng/test-case-detail-client.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TestCaseLayout } from '@/components/eng/test-case-layout'
import { SourceDataPanel } from '@/components/eng/source-data-panel'
import { ExpectedResultsPanel } from '@/components/eng/expected-results-panel'
import { ExternalDataPanel } from '@/components/eng/external-data-panel'
import { useTestCaseDetail } from '@/data/eng/providers/client'
import { Flag, Wrench } from 'lucide-react'
import Link from 'next/link'

export function TestCaseDetailClient({ caseId }: { caseId: string }) {
  const { data: testCase } = useTestCaseDetail(caseId)

  const needsExternalPanel = ['validation', 'payment_matching', 'invoice_discovery'].includes(testCase.competency)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{testCase.competency}</Badge>
            <span className="text-sm text-muted-foreground">Created by {testCase.createdBy}</span>
          </div>
          <h2 className="text-lg font-medium">{testCase.description ?? 'Untitled test case'}</h2>
        </div>
        <Button size="sm" variant="outline">
          <Flag className="h-4 w-4" /> Flag for Fix
        </Button>
      </div>

      {testCase.fixRequests.length > 0 && (
        <Card className="p-3 space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Fix Requests ({testCase.fixRequests.length})
          </h3>
          {testCase.fixRequests.map((fix) => (
            <Link key={fix.id} href={`/eng/fixes/${fix.id}`} className="block text-sm p-2 rounded hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Badge variant={fix.status === 'open' ? 'destructive' : 'secondary'} className="text-xs">{fix.status}</Badge>
                <span className="text-muted-foreground truncate">{fix.engineerNotes}</span>
              </div>
            </Link>
          ))}
        </Card>
      )}

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
            <ExternalDataPanel sourceType="api" data={{}} metadata={{ note: 'Run the pipeline to see external data' }} />
          }
          expectedPanel={<ExpectedResultsPanel expectedFields={testCase.expectedFields} actualFields={{}} />}
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
          expectedPanel={<ExpectedResultsPanel expectedFields={testCase.expectedFields} actualFields={{}} />}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create server pages with HydrationBoundary**

```typescript
// src/app/eng/providers/[providerId]/[profileId]/test-cases/page.tsx
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTestCases } from '@/data/eng/providers/server'
import { testCasesQueryKey } from '@/data/eng/providers/shared'
import { TestCaseListClient } from '@/components/eng/test-case-list-client'
import { FadeIn } from '@/components/fade-in'
import { Button } from '@/components/ui/button'
import { Plus, Play } from 'lucide-react'

export default async function TestCasesPage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { providerId, profileId } = await params
  const queryClient = new QueryClient()
  const testCases = await getTestCases(profileId)
  queryClient.setQueryData(testCasesQueryKey(profileId), testCases)

  return (
    <FadeIn>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Test Cases</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline"><Play className="h-4 w-4" /> Run Tests</Button>
            <Button size="sm"><Plus className="h-4 w-4" /> New Test Case</Button>
          </div>
        </div>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <TestCaseListClient providerId={providerId} profileId={profileId} />
        </HydrationBoundary>
      </div>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/test-cases/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/test-cases/[caseId]/page.tsx
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getTestCaseDetail } from '@/data/eng/providers/server'
import { testCaseDetailQueryKey } from '@/data/eng/providers/shared'
import { TestCaseDetailClient } from '@/components/eng/test-case-detail-client'
import { FadeIn } from '@/components/fade-in'

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string; caseId: string }>
}) {
  const { caseId } = await params
  const queryClient = new QueryClient()
  const testCase = await getTestCaseDetail(caseId)
  queryClient.setQueryData(testCaseDetailQueryKey(caseId), testCase)

  return (
    <FadeIn>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TestCaseDetailClient caseId={caseId} />
      </HydrationBoundary>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/test-cases/[caseId]/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/eng/test-case-list-client.tsx src/components/eng/test-case-detail-client.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/test-cases/
git commit -m "feat(eng): add test cases tab with list and detail views"
```

---

### Task 15: Pipeline Tab

**Files:**
- Create: `src/components/eng/pipeline-section.tsx`
- Create: `src/components/eng/pipeline-client.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/pipeline/page.tsx`
- Create: `src/app/eng/providers/[providerId]/[profileId]/pipeline/loading.tsx`

- [ ] **Step 1: Create pipeline section component**

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
              <Flag className="h-4 w-4" /> Flag for Fix
            </Button>
          )}
          <Button size="sm" onClick={handleRun} disabled={running}>
            <Play className="h-4 w-4" /> {running ? 'Running...' : 'Run'}
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

- [ ] **Step 2: Create pipeline client and server page**

```typescript
// src/components/eng/pipeline-client.tsx
'use client'

import { PipelineSection } from '@/components/eng/pipeline-section'
import { useProfileDetail } from '@/data/eng/providers/client'

export function PipelineClient({ profileId }: { profileId: string }) {
  const { data: profile } = useProfileDetail(profileId)
  const caps = profile.capabilities

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Pipeline Test Lab</h2>
      <p className="text-sm text-muted-foreground">
        Test individual pipeline steps. Upload or select a bill to run through each step.
      </p>
      <div className="space-y-4">
        <PipelineSection title="1. Identify" competency="identification" available={true} />
        <PipelineSection title="2. Extract" competency="extraction" available={!!caps.extraction} />
        <PipelineSection title="3. Validate" competency="validation" available={!!caps.validation} />
        <PipelineSection title="4. Match Payment" competency="payment_matching" available={!!caps.paymentStatus} />
      </div>
    </div>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/pipeline/page.tsx
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getProfileDetail } from '@/data/eng/providers/server'
import { profileDetailQueryKey } from '@/data/eng/providers/shared'
import { PipelineClient } from '@/components/eng/pipeline-client'
import { FadeIn } from '@/components/fade-in'

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ providerId: string; profileId: string }>
}) {
  const { profileId } = await params
  const queryClient = new QueryClient()
  const profile = await getProfileDetail(profileId)
  queryClient.setQueryData(profileDetailQueryKey(profileId), profile)

  return (
    <FadeIn>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PipelineClient profileId={profileId} />
      </HydrationBoundary>
    </FadeIn>
  )
}
```

```typescript
// src/app/eng/providers/[providerId]/[profileId]/pipeline/loading.tsx
import { PageLoader } from '@/components/page-loader'
export default function Loading() { return <PageLoader /> }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/eng/pipeline-section.tsx src/components/eng/pipeline-client.tsx src/app/eng/providers/\[providerId\]/\[profileId\]/pipeline/
git commit -m "feat(eng): add pipeline test lab tab"
```

---

### Task 16: Flag for Fix Modal

**Files:**
- Create: `src/components/eng/flag-for-fix-modal.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
// src/components/eng/flag-for-fix-modal.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createFixRequest } from '@/data/eng/providers/actions/create-fix-request'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  profileId: string
  competency: string
  testCaseId?: string
  testRunId?: string
  providerRequestId?: string
  sourceData?: Record<string, any>
  actualResult: Record<string, any>
  expectedResult?: Record<string, any>
  rawExternal?: Record<string, any>
}

export function FlagForFixModal({
  open, onClose, profileId, competency,
  testCaseId, testRunId, providerRequestId,
  sourceData, actualResult, expectedResult, rawExternal,
}: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!notes.trim()) return
    setSaving(true)
    const result = await createFixRequest({
      profileId, competency, testCaseId, testRunId, providerRequestId,
      sourceData, actualResult, expectedResult, rawExternal,
      engineerNotes: notes,
    })
    setSaving(false)
    if (result.success) {
      toast.success(`Fix request created: ${result.id?.slice(0, 8)}`)
      onClose()
      setNotes('')
    } else {
      toast.error(result.error ?? 'Failed to create fix request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Flag for Fix</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe what's wrong and what the correct result should be. This context helps the AI understand and fix the issue.
          </p>
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
            <Button onClick={handleSubmit} loading={saving} disabled={!notes.trim()}>
              Create Fix Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/eng/flag-for-fix-modal.tsx
git commit -m "feat(eng): add flag-for-fix modal using server action"
```

---

### Task 17: CNPJ Lookup API Route

**Files:**
- Create: `src/app/api/eng/cnpj-lookup/route.ts`

This is one of the few API routes (not a server action) because it calls an external API and returns data to a client component.

- [ ] **Step 1: Create the CNPJ lookup route**

```typescript
// src/app/api/eng/cnpj-lookup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { lookupCnpj } from '@/lib/billing-intelligence/identification/cnpj-lookup'

export async function GET(request: NextRequest) {
  const taxId = request.nextUrl.searchParams.get('taxId')
  if (!taxId) return NextResponse.json({ error: 'taxId required' }, { status: 400 })

  try {
    const result = await lookupCnpj(taxId.replace(/[.\-/]/g, ''))
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/eng/cnpj-lookup/route.ts
git commit -m "feat(eng): add CNPJ lookup API route for provider creation"
```

---

### Task 18: Update docs/project/components.md

- [ ] **Step 1: Add new eng components to the component catalog**

Add entries for the new reusable components created in Plans 3a-2 and 3a-3 to `docs/project/components.md`.

- [ ] **Step 2: Commit**

```bash
git add docs/project/components.md
git commit -m "docs: add eng platform components to component catalog"
```

---

### Task 19: Verify All Pages Compile and Render

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run dev server and check routes**

```bash
npm run dev
```

Visit each route and verify it renders:
- `/eng/providers` — registry with table
- `/eng/providers/new` — creation form with disabled fields
- `/eng/providers/[id]` — detail with profiles
- `/eng/providers/[id]/new-profile` — profile creation
- `/eng/providers/[id]/[profileId]/overview` — overview tab
- `/eng/providers/[id]/[profileId]/test-cases` — test cases list
- `/eng/providers/[id]/[profileId]/pipeline` — pipeline sections

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(eng): resolve compilation and rendering issues"
```
