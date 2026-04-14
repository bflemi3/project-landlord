# Playground UI: Requests Queue & Fixes (AI Work Queue) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the requests queue (`/eng/requests`) and fixes/AI work queue (`/eng/fixes`) sections of the engineering playground, providing engineers with a unified inbox for provider work and a structured channel for engineer-to-AI fix communication.

**Architecture:** Two route groups under `/eng/` — requests and fixes. Each has a list page and a detail page. The requests queue displays provider requests from four source types with priority sorting and assignment. The fixes section displays fix requests created from provider pages (test cases tab and pipeline tab). Both use the eng Supabase client for data fetching, API routes for mutations, and shared components from Plan 3a-2. Fix request detail reuses the same panel primitives (`SourceDataPanel`, `ExternalDataPanel`, `ExpectedResultsPanel`) as test case detail views.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (eng client), Recharts (sparklines in requests)

**Part of:** Playground UI (Plan 3a)
**Depends on:** Plans 3a-1 (database — `provider_requests`, `test_fix_requests`, enums), 3a-2 (shared components — `BillPdfViewer`, `SourceDataPanel`, `ExternalDataPanel`, `ExpectedResultsPanel`, `TestCaseLayout`, `EmptyState`, `JsonViewer`, `Badge`, `ThresholdBadge`), 3a-3 (provider pages — fix creation flows via "Flag for fix" on test cases tab and pipeline tab)
**Blocks:** Plan 3a-6 (code review — system-generated requests created by test runner)

---

## File Structure

```
src/app/eng/requests/
  page.tsx                          # Requests queue list page
  new-request-modal.tsx             # "New request" modal for engineer-created requests
  request-row.tsx                   # Table row component with priority sorting
  request-filters.tsx               # Filter controls (status, source)
  [requestId]/
    page.tsx                        # Request detail page
    request-actions.tsx             # Action buttons (Assign, Start work, etc.)
    correction-diff.tsx             # Diff view for correction requests

src/app/eng/fixes/
  page.tsx                          # Fixes list page
  fix-row.tsx                       # Table row component
  fix-filters.tsx                   # Filter controls (status, profile, competency)
  [fixId]/
    page.tsx                        # Fix request detail page
    fix-actions.tsx                 # Status actions (Mark resolved)

src/app/api/eng/requests/
  route.ts                          # POST: create engineer request
  [requestId]/
    route.ts                        # PATCH: update request (assign, status change, notes)

src/app/api/eng/fixes/
  [fixId]/
    route.ts                        # PATCH: update fix request (resolve)

src/lib/hooks/eng/
  use-requests.ts                   # Fetch and filter requests
  use-request-detail.ts             # Fetch single request with relations
  use-fixes.ts                      # Fetch and filter fix requests
  use-fix-detail.ts                 # Fetch single fix request with relations
  use-request-mutations.ts          # Mutations for requests (assign, status change, create)
  use-fix-mutations.ts              # Mutations for fixes (resolve)
```

---

## Task 1: Requests API Routes

**Files:**
- Create: `src/app/api/eng/requests/route.ts`
- Create: `src/app/api/eng/requests/[requestId]/route.ts`

- [ ] **Step 1: Create the POST route for engineer-created requests**

Create `src/app/api/eng/requests/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const engClient = createEngServerClient()

  // Verify engineer
  const { data: engineer } = await engClient
    .from('engineer_allowlist')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!engineer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { tax_id, test_bill_id, notes } = body as {
    tax_id?: string
    test_bill_id?: string
    notes?: string
  }

  if (!tax_id && !test_bill_id) {
    return NextResponse.json(
      { error: 'Either tax_id or test_bill_id is required' },
      { status: 400 }
    )
  }

  const { data, error } = await engClient
    .from('provider_requests')
    .insert({
      source: 'engineer' as const,
      status: 'pending' as const,
      test_bill_id: test_bill_id || null,
      requested_by: user.id,
      notes: notes || null,
      correction_original: tax_id || null, // Store tax_id in correction_original for engineer requests
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create the PATCH route for request updates**

Create `src/app/api/eng/requests/[requestId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const engClient = createEngServerClient()

  // Verify engineer
  const { data: engineer } = await engClient
    .from('engineer_allowlist')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!engineer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action, decline_reason, notes } = body as {
    action?: 'assign' | 'start' | 'testing' | 'complete' | 'decline'
    decline_reason?: string
    notes?: string
  }

  // Build update object based on action
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (notes !== undefined) {
    update.notes = notes
  }

  if (action === 'assign') {
    update.assigned_to = user.id
    update.assigned_at = new Date().toISOString()
    update.status = 'in_progress'
  } else if (action === 'start') {
    update.status = 'in_progress'
  } else if (action === 'testing') {
    update.status = 'testing'
  } else if (action === 'complete') {
    update.status = 'complete'
  } else if (action === 'decline') {
    if (!decline_reason) {
      return NextResponse.json(
        { error: 'Decline reason is required' },
        { status: 400 }
      )
    }
    update.status = 'declined'
    update.decline_reason = decline_reason
  }

  const { data, error } = await engClient
    .from('provider_requests')
    .update(update)
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 3: Verify both routes compile and have correct imports**

```bash
npx tsc --noEmit --pretty
```

---

## Task 2: Fixes API Route

**Files:**
- Create: `src/app/api/eng/fixes/[fixId]/route.ts`

- [ ] **Step 1: Create the PATCH route for fix request updates**

Create `src/app/api/eng/fixes/[fixId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createEngServerClient } from '@/lib/supabase/eng-client'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fixId: string }> }
) {
  const { fixId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const engClient = createEngServerClient()

  // Verify engineer
  const { data: engineer } = await engClient
    .from('engineer_allowlist')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!engineer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body as { action: 'resolve' | 'reopen' }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (action === 'resolve') {
    update.status = 'resolved'
    update.resolved_at = new Date().toISOString()
  } else if (action === 'reopen') {
    update.status = 'open'
    update.resolved_at = null
  }

  const { data, error } = await engClient
    .from('test_fix_requests')
    .update(update)
    .eq('id', fixId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Verify the route compiles**

```bash
npx tsc --noEmit --pretty
```

---

## Task 3: Requests Data Hooks

**Files:**
- Create: `src/lib/hooks/eng/use-requests.ts`
- Create: `src/lib/hooks/eng/use-request-detail.ts`
- Create: `src/lib/hooks/eng/use-request-mutations.ts`

- [ ] **Step 1: Create the requests list hook with priority sorting**

Create `src/lib/hooks/eng/use-requests.ts`:

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'
import type { Database } from '@/lib/supabase/database.types'

type ProviderRequest =
  Database['public']['Tables']['provider_requests']['Row']

type RequestWithRelations = ProviderRequest & {
  provider?: { id: string; display_name: string | null; name: string } | null
  profile?: { id: string; display_name: string | null; status: string } | null
  assigned_engineer?: { email: string } | null
  requested_by_user?: { email: string } | null
}

export type RequestFilter = {
  status?: string
  source?: string
}

/**
 * Priority tiers for request sorting:
 * 1. Corrections on active providers (bad data for real users)
 * 2. System alerts (accuracy regression)
 * 3. New provider requests
 * 4. Corrections on draft providers
 * Within each tier: oldest first.
 */
function getRequestPriority(request: RequestWithRelations): number {
  if (
    request.source === 'user_correction' &&
    request.profile?.status === 'active'
  ) {
    return 0
  }
  if (request.source === 'system') {
    return 1
  }
  if (request.source === 'user_new_provider' || request.source === 'engineer') {
    return 2
  }
  if (
    request.source === 'user_correction' &&
    request.profile?.status !== 'active'
  ) {
    return 3
  }
  return 4
}

function sortRequests(
  requests: RequestWithRelations[]
): RequestWithRelations[] {
  return [...requests].sort((a, b) => {
    const priorityDiff = getRequestPriority(a) - getRequestPriority(b)
    if (priorityDiff !== 0) return priorityDiff
    // Within same priority: oldest first
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  })
}

export function useRequests(filter?: RequestFilter) {
  const [requests, setRequests] = useState<RequestWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createEngBrowserClient()

      let query = supabase
        .from('provider_requests')
        .select(
          `
          *,
          provider:providers(id, display_name, name),
          profile:provider_invoice_profiles(id, display_name, status),
          assigned_engineer:engineer_allowlist!provider_requests_assigned_to_fkey(email),
          requested_by_user:profiles!provider_requests_requested_by_fkey(email)
        `
        )
        .order('created_at', { ascending: false })

      if (filter?.status) {
        query = query.eq('status', filter.status)
      }
      if (filter?.source) {
        query = query.eq('source', filter.source)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setRequests(sortRequests((data as RequestWithRelations[]) ?? []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }, [filter?.status, filter?.source])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return { requests, loading, error, refetch: fetchRequests }
}
```

- [ ] **Step 2: Create the request detail hook**

Create `src/lib/hooks/eng/use-request-detail.ts`:

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'

export interface RequestDetail {
  id: string
  source: string
  status: string
  provider_id: string | null
  profile_id: string | null
  test_bill_id: string | null
  requested_by: string | null
  assigned_to: string | null
  assigned_at: string | null
  decline_reason: string | null
  correction_field: string | null
  correction_original: string | null
  correction_value: string | null
  notes: string | null
  created_at: string
  updated_at: string
  provider?: { id: string; display_name: string | null; name: string } | null
  profile?: {
    id: string
    display_name: string | null
    status: string
  } | null
  assigned_engineer?: { email: string; user_id: string } | null
  requested_by_user?: { email: string } | null
  test_bill?: {
    id: string
    storage_path: string
    file_name: string
  } | null
}

export function useRequestDetail(requestId: string) {
  const [request, setRequest] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequest = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createEngBrowserClient()

      const { data, error: fetchError } = await supabase
        .from('provider_requests')
        .select(
          `
          *,
          provider:providers(id, display_name, name),
          profile:provider_invoice_profiles(id, display_name, status),
          assigned_engineer:engineer_allowlist!provider_requests_assigned_to_fkey(email, user_id),
          requested_by_user:profiles!provider_requests_requested_by_fkey(email),
          test_bill:provider_test_bills(id, storage_path, file_name)
        `
        )
        .eq('id', requestId)
        .single()

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setRequest(data as unknown as RequestDetail)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch request'
      )
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    fetchRequest()
  }, [fetchRequest])

  return { request, loading, error, refetch: fetchRequest }
}
```

- [ ] **Step 3: Create request mutations hook**

Create `src/lib/hooks/eng/use-request-mutations.ts`:

```typescript
'use client'

import { useCallback, useState } from 'react'

type RequestAction = 'assign' | 'start' | 'testing' | 'complete' | 'decline'

export function useRequestMutations(requestId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRequest = useCallback(
    async (action: RequestAction, extra?: { decline_reason?: string; notes?: string }) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/eng/requests/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update request')
        }

        return await response.json()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update request'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [requestId]
  )

  const createRequest = useCallback(
    async (data: { tax_id?: string; test_bill_id?: string; notes?: string }) => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/eng/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const resData = await response.json()
          throw new Error(resData.error || 'Failed to create request')
        }

        return await response.json()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create request'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { updateRequest, createRequest, loading, error }
}
```

- [ ] **Step 4: Verify hooks compile**

```bash
npx tsc --noEmit --pretty
```

---

## Task 4: Fixes Data Hooks

**Files:**
- Create: `src/lib/hooks/eng/use-fixes.ts`
- Create: `src/lib/hooks/eng/use-fix-detail.ts`
- Create: `src/lib/hooks/eng/use-fix-mutations.ts`

- [ ] **Step 1: Create the fixes list hook**

Create `src/lib/hooks/eng/use-fixes.ts`:

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'

export interface FixListItem {
  id: string
  profile_id: string
  test_case_id: string | null
  provider_request_id: string | null
  competency: string
  engineer_notes: string
  status: string
  created_by: string
  resolved_at: string | null
  created_at: string
  updated_at: string
  profile?: {
    id: string
    display_name: string | null
    provider_id: string | null
  } | null
  provider_request?: { id: string } | null
  created_by_engineer?: { email: string } | null
}

export type FixFilter = {
  status?: string
  profile_id?: string
  competency?: string
}

export function useFixes(filter?: FixFilter) {
  const [fixes, setFixes] = useState<FixListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFixes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createEngBrowserClient()

      let query = supabase
        .from('test_fix_requests')
        .select(
          `
          *,
          profile:provider_invoice_profiles(id, display_name, provider_id),
          provider_request:provider_requests(id),
          created_by_engineer:engineer_allowlist!test_fix_requests_created_by_fkey(email)
        `
        )
        .order('status', { ascending: true }) // open before resolved
        .order('created_at', { ascending: false })

      if (filter?.status) {
        query = query.eq('status', filter.status)
      }
      if (filter?.profile_id) {
        query = query.eq('profile_id', filter.profile_id)
      }
      if (filter?.competency) {
        query = query.eq('competency', filter.competency)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setFixes((data as unknown as FixListItem[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fixes')
    } finally {
      setLoading(false)
    }
  }, [filter?.status, filter?.profile_id, filter?.competency])

  useEffect(() => {
    fetchFixes()
  }, [fetchFixes])

  return { fixes, loading, error, refetch: fetchFixes }
}
```

- [ ] **Step 2: Create the fix detail hook**

Create `src/lib/hooks/eng/use-fix-detail.ts`:

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'

export interface FixDetail {
  id: string
  profile_id: string
  test_case_id: string | null
  test_run_id: string | null
  provider_request_id: string | null
  competency: string
  source_data: Record<string, unknown> | null
  actual_result: Record<string, unknown>
  expected_result: Record<string, unknown> | null
  raw_external: Record<string, unknown> | null
  engineer_notes: string
  status: string
  created_by: string
  resolved_at: string | null
  created_at: string
  updated_at: string
  profile?: {
    id: string
    display_name: string | null
    provider_id: string | null
  } | null
  test_case?: {
    id: string
    description: string | null
    competency: string
  } | null
  provider_request?: { id: string; source: string } | null
  created_by_engineer?: { email: string } | null
}

export function useFixDetail(fixId: string) {
  const [fix, setFix] = useState<FixDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFix = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createEngBrowserClient()

      const { data, error: fetchError } = await supabase
        .from('test_fix_requests')
        .select(
          `
          *,
          profile:provider_invoice_profiles(id, display_name, provider_id),
          test_case:test_cases(id, description, competency),
          provider_request:provider_requests(id, source),
          created_by_engineer:engineer_allowlist!test_fix_requests_created_by_fkey(email)
        `
        )
        .eq('id', fixId)
        .single()

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setFix(data as unknown as FixDetail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fix')
    } finally {
      setLoading(false)
    }
  }, [fixId])

  useEffect(() => {
    fetchFix()
  }, [fetchFix])

  return { fix, loading, error, refetch: fetchFix }
}
```

- [ ] **Step 3: Create fix mutations hook**

Create `src/lib/hooks/eng/use-fix-mutations.ts`:

```typescript
'use client'

import { useCallback, useState } from 'react'

export function useFixMutations(fixId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFix = useCallback(
    async (action: 'resolve' | 'reopen') => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/eng/fixes/${fixId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update fix')
        }

        return await response.json()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update fix'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fixId]
  )

  return { updateFix, loading, error }
}
```

- [ ] **Step 4: Verify hooks compile**

```bash
npx tsc --noEmit --pretty
```

---

## Task 5: Requests Queue List Page

**Files:**
- Create: `src/app/eng/requests/request-filters.tsx`
- Create: `src/app/eng/requests/request-row.tsx`
- Create: `src/app/eng/requests/page.tsx`

- [ ] **Step 1: Create the request filters component**

Create `src/app/eng/requests/request-filters.tsx`:

```typescript
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RequestFilter } from '@/lib/hooks/eng/use-requests'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'testing', label: 'Testing' },
  { value: 'complete', label: 'Complete' },
  { value: 'declined', label: 'Declined' },
]

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All sources' },
  { value: 'user_new_provider', label: 'New Provider' },
  { value: 'user_correction', label: 'Correction' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'system', label: 'System' },
]

interface RequestFiltersProps {
  filter: RequestFilter
  onFilterChange: (filter: RequestFilter) => void
}

export function RequestFilters({
  filter,
  onFilterChange,
}: RequestFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filter.status || 'all'}
        onValueChange={(value) =>
          onFilterChange({
            ...filter,
            status: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.source || 'all'}
        onValueChange={(value) =>
          onFilterChange({
            ...filter,
            source: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

- [ ] **Step 2: Create the request table row component**

Create `src/app/eng/requests/request-row.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

const SOURCE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  user_new_provider: { label: 'New Provider', variant: 'default' },
  user_correction: { label: 'Correction', variant: 'destructive' },
  engineer: { label: 'Engineer', variant: 'secondary' },
  system: { label: 'System', variant: 'outline' },
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  testing: { label: 'Testing', variant: 'secondary' },
  complete: { label: 'Complete', variant: 'default' },
  declined: { label: 'Declined', variant: 'destructive' },
}

interface RequestRowProps {
  request: {
    id: string
    source: string
    status: string
    created_at: string
    provider?: { id: string; display_name: string | null; name: string } | null
    assigned_engineer?: { email: string } | null
    requested_by_user?: { email: string } | null
  }
}

export function RequestRow({ request }: RequestRowProps) {
  const sourceInfo = SOURCE_LABELS[request.source] ?? {
    label: request.source,
    variant: 'outline' as const,
  }
  const statusInfo = STATUS_LABELS[request.status] ?? {
    label: request.status,
    variant: 'outline' as const,
  }

  const providerName =
    request.provider?.display_name || request.provider?.name || 'Unknown'
  const assignedTo = request.assigned_engineer?.email ?? '\u2014'
  const requestedBy = request.requested_by_user?.email ?? '\u2014'

  return (
    <Link
      href={`/eng/requests/${request.id}`}
      className="grid grid-cols-[120px_1fr_1fr_1fr_140px_120px] items-center gap-4 border-b px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
    >
      <div>
        <Badge variant={sourceInfo.variant}>{sourceInfo.label}</Badge>
      </div>
      <div className="truncate font-medium">{providerName}</div>
      <div className="truncate text-muted-foreground">{requestedBy}</div>
      <div className="truncate text-muted-foreground">{assignedTo}</div>
      <div className="text-muted-foreground">
        {formatDistanceToNow(new Date(request.created_at), {
          addSuffix: true,
        })}
      </div>
      <div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create the requests queue list page**

Create `src/app/eng/requests/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRequests, type RequestFilter } from '@/lib/hooks/eng/use-requests'
import { RequestFilters } from './request-filters'
import { RequestRow } from './request-row'
import { NewRequestModal } from './new-request-modal'
import { EmptyState } from '@/components/eng/empty-state'
import { PageLoader } from '@/components/page-loader'

export default function RequestsPage() {
  const [filter, setFilter] = useState<RequestFilter>({})
  const [modalOpen, setModalOpen] = useState(false)
  const { requests, loading, error, refetch } = useRequests(filter)

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
          <p className="text-sm text-muted-foreground">
            Provider creation and correction work queue
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus />
          New request
        </Button>
      </div>

      {/* Filters */}
      <RequestFilters filter={filter} onFilterChange={setFilter} />

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      {requests.length === 0 ? (
        <EmptyState
          heading="No requests"
          description="No provider requests match the current filters."
          action={
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              <Plus />
              Create a request
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          {/* Table header */}
          <div className="grid grid-cols-[120px_1fr_1fr_1fr_140px_120px] items-center gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div>Source</div>
            <div>Provider</div>
            <div>Requested by</div>
            <div>Assigned to</div>
            <div>Created</div>
            <div>Status</div>
          </div>

          {/* Rows */}
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </div>
      )}

      {/* New request modal */}
      <NewRequestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => {
          setModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify page compiles and renders the correct layout**

```bash
npx tsc --noEmit --pretty
```

---

## Task 6: New Request Modal

**Files:**
- Create: `src/app/eng/requests/new-request-modal.tsx`

- [ ] **Step 1: Create the new request modal for engineer-created requests**

Create `src/app/eng/requests/new-request-modal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestMutations } from '@/lib/hooks/eng/use-request-mutations'

interface NewRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function NewRequestModal({
  open,
  onOpenChange,
  onCreated,
}: NewRequestModalProps) {
  const [taxId, setTaxId] = useState('')
  const [notes, setNotes] = useState('')
  const { createRequest, loading, error } = useRequestMutations('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      await createRequest({
        tax_id: taxId || undefined,
        notes: notes || undefined,
      })
      setTaxId('')
      setNotes('')
      onCreated()
    } catch {
      // Error is set in the hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New request</DialogTitle>
            <DialogDescription>
              Create a provider request. Enter a tax ID to look up the company,
              or upload a bill to extract the tax ID.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tax-id">Tax ID (CNPJ)</Label>
              <Input
                id="tax-id"
                placeholder="00.000.000/0001-00"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>

            {/* TODO: Bill upload field — reuses BillPdfViewer upload mode from 3a-2 */}
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Bill upload coming in a future task (uses BillPdfViewer upload
              mode)
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Context for the request — why is this needed?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (!taxId)}>
              {loading ? 'Creating...' : 'Create request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify modal compiles**

```bash
npx tsc --noEmit --pretty
```

---

## Task 7: Request Detail Page

**Files:**
- Create: `src/app/eng/requests/[requestId]/request-actions.tsx`
- Create: `src/app/eng/requests/[requestId]/correction-diff.tsx`
- Create: `src/app/eng/requests/[requestId]/page.tsx`

- [ ] **Step 1: Create the correction diff component**

Create `src/app/eng/requests/[requestId]/correction-diff.tsx`:

```typescript
'use client'

interface CorrectionDiffProps {
  field: string
  original: string
  corrected: string
}

export function CorrectionDiff({
  field,
  original,
  corrected,
}: CorrectionDiffProps) {
  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
        Correction: {field}
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Extracted (original)
          </div>
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-mono text-destructive">
            {original}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Corrected
          </div>
          <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm font-mono text-green-700 dark:text-green-400">
            {corrected}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the request action buttons component**

Create `src/app/eng/requests/[requestId]/request-actions.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRequestMutations } from '@/lib/hooks/eng/use-request-mutations'

interface RequestActionsProps {
  requestId: string
  status: string
  assignedTo: string | null
  currentUserId: string
  onUpdated: () => void
}

export function RequestActions({
  requestId,
  status,
  assignedTo,
  currentUserId,
  onUpdated,
}: RequestActionsProps) {
  const { updateRequest, loading } = useRequestMutations(requestId)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const isAssigned = assignedTo === currentUserId

  async function handleAction(
    action: 'assign' | 'start' | 'testing' | 'complete'
  ) {
    try {
      await updateRequest(action)
      onUpdated()
    } catch {
      // Error handled in hook
    }
  }

  async function handleDecline() {
    try {
      await updateRequest('decline', { decline_reason: declineReason })
      setDeclineOpen(false)
      setDeclineReason('')
      onUpdated()
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Assign */}
      {status === 'pending' && !assignedTo && (
        <Button
          onClick={() => handleAction('assign')}
          disabled={loading}
        >
          Assign to me
        </Button>
      )}

      {/* Start work */}
      {status === 'pending' && isAssigned && (
        <Button
          onClick={() => handleAction('start')}
          disabled={loading}
        >
          Start work
        </Button>
      )}

      {/* Mark testing */}
      {status === 'in_progress' && isAssigned && (
        <Button
          onClick={() => handleAction('testing')}
          disabled={loading}
        >
          Mark testing
        </Button>
      )}

      {/* Complete */}
      {(status === 'testing' || status === 'in_progress') && isAssigned && (
        <Button
          onClick={() => handleAction('complete')}
          disabled={loading}
        >
          Complete
        </Button>
      )}

      {/* Decline */}
      {status !== 'complete' && status !== 'declined' && (
        <Button
          variant="outline"
          onClick={() => setDeclineOpen(true)}
          disabled={loading}
        >
          Decline
        </Button>
      )}

      {/* Decline dialog */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Decline request</DialogTitle>
            <DialogDescription>
              Provide a reason for declining this request. The requestor will
              be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Reason for declining..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeclineOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={loading || !declineReason.trim()}
            >
              {loading ? 'Declining...' : 'Decline request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Create the request detail page**

Create `src/app/eng/requests/[requestId]/page.tsx`:

```typescript
'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { useRequestDetail } from '@/lib/hooks/eng/use-request-detail'
import { useEngContext } from '@/lib/hooks/eng/use-eng-context'
import { BillPdfViewer } from '@/components/eng/bill-pdf-viewer'
import { RequestActions } from './request-actions'
import { CorrectionDiff } from './correction-diff'
import { PageLoader } from '@/components/page-loader'

const SOURCE_LABELS: Record<string, string> = {
  user_new_provider: 'New Provider',
  user_correction: 'Correction',
  engineer: 'Engineer',
  system: 'System',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  testing: 'Testing',
  complete: 'Complete',
  declined: 'Declined',
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = use(params)
  const { request, loading, error, refetch } = useRequestDetail(requestId)
  const { userId } = useEngContext()

  if (loading) return <PageLoader />

  if (error || !request) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-sm text-muted-foreground">
          {error || 'Request not found'}
        </p>
        <Button variant="outline" asChild>
          <Link href="/eng/requests">Back to requests</Link>
        </Button>
      </div>
    )
  }

  const isCorrection = request.source === 'user_correction'
  const hasProvider = !!request.provider_id
  const hasBill = !!request.test_bill_id

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back nav */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/eng/requests">
            <ArrowLeft />
            Back to requests
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Request
            </h1>
            <Badge variant="outline">
              {SOURCE_LABELS[request.source] ?? request.source}
            </Badge>
            <Badge>
              {STATUS_LABELS[request.status] ?? request.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created{' '}
            {formatDistanceToNow(new Date(request.created_at), {
              addSuffix: true,
            })}
            {request.requested_by_user &&
              ` by ${request.requested_by_user.email}`}
          </p>
        </div>

        {/* Actions */}
        <RequestActions
          requestId={request.id}
          status={request.status}
          assignedTo={request.assigned_to}
          currentUserId={userId}
          onUpdated={refetch}
        />
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-md border p-4 text-sm lg:grid-cols-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Assigned to
          </div>
          <div>
            {request.assigned_engineer?.email ?? 'Unassigned'}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Provider
          </div>
          <div>
            {request.provider ? (
              <Link
                href={`/eng/providers/${request.provider.id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {request.provider.display_name || request.provider.name}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-muted-foreground">
                Unknown provider
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Profile
          </div>
          <div>
            {request.profile ? (
              <Link
                href={`/eng/providers/${request.provider?.id}/${request.profile.id}/overview`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {request.profile.display_name}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </div>
          <div>{STATUS_LABELS[request.status] ?? request.status}</div>
        </div>
      </div>

      {/* Decline reason */}
      {request.status === 'declined' && request.decline_reason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-1 text-sm font-medium text-destructive">
            Decline reason
          </div>
          <p className="text-sm">{request.decline_reason}</p>
        </div>
      )}

      {/* Content area — two columns: bill viewer + details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Bill PDF */}
        <div>
          {hasBill && request.test_bill ? (
            <BillPdfViewer storagePath={request.test_bill.storage_path} />
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              No bill attached to this request
            </div>
          )}
        </div>

        {/* Right: Correction diff + notes + links */}
        <div className="flex flex-col gap-4">
          {/* Correction diff */}
          {isCorrection &&
            request.correction_field &&
            request.correction_original &&
            request.correction_value && (
              <CorrectionDiff
                field={request.correction_field}
                original={request.correction_original}
                corrected={request.correction_value}
              />
            )}

          {/* Notes */}
          <div className="rounded-md border">
            <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
              Notes
            </div>
            <div className="p-4">
              {request.notes ? (
                <p className="whitespace-pre-wrap text-sm">
                  {request.notes}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes added yet.
                </p>
              )}
            </div>
          </div>

          {/* Create provider link (for new provider requests without a linked provider) */}
          {request.source === 'user_new_provider' && !hasProvider && (
            <Button asChild>
              <Link href="/eng/providers/new">
                Create provider for this request
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify the detail page compiles**

```bash
npx tsc --noEmit --pretty
```

---

## Task 8: Fixes List Page

**Files:**
- Create: `src/app/eng/fixes/fix-filters.tsx`
- Create: `src/app/eng/fixes/fix-row.tsx`
- Create: `src/app/eng/fixes/page.tsx`

- [ ] **Step 1: Create the fix filters component**

Create `src/app/eng/fixes/fix-filters.tsx`:

```typescript
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FixFilter } from '@/lib/hooks/eng/use-fixes'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

const COMPETENCY_OPTIONS = [
  { value: 'all', label: 'All competencies' },
  { value: 'identification', label: 'Identification' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'validation', label: 'Validation' },
]

interface FixFiltersProps {
  filter: FixFilter
  profiles: Array<{ id: string; display_name: string | null }>
  onFilterChange: (filter: FixFilter) => void
}

export function FixFilters({
  filter,
  profiles,
  onFilterChange,
}: FixFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={filter.status || 'open'}
        onValueChange={(value) =>
          onFilterChange({
            ...filter,
            status: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.competency || 'all'}
        onValueChange={(value) =>
          onFilterChange({
            ...filter,
            competency: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Competency" />
        </SelectTrigger>
        <SelectContent>
          {COMPETENCY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {profiles.length > 0 && (
        <Select
          value={filter.profile_id || 'all'}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              profile_id: value === 'all' ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Profile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All profiles</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.display_name || p.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the fix table row component**

Create `src/app/eng/fixes/fix-row.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import type { FixListItem } from '@/lib/hooks/eng/use-fixes'

const COMPETENCY_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  identification: 'default',
  extraction: 'secondary',
  validation: 'outline',
}

interface FixRowProps {
  fix: FixListItem
}

export function FixRow({ fix }: FixRowProps) {
  const shortId = fix.id.slice(0, 8)
  const profileName = fix.profile?.display_name || 'Unknown profile'
  const createdBy = fix.created_by_engineer?.email ?? '\u2014'
  const notesPreview =
    fix.engineer_notes.length > 80
      ? fix.engineer_notes.slice(0, 80) + '...'
      : fix.engineer_notes

  return (
    <Link
      href={`/eng/fixes/${fix.id}`}
      className="grid grid-cols-[90px_1fr_120px_1fr_90px_1fr_1fr_140px] items-center gap-4 border-b px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
    >
      {/* ID */}
      <div className="font-mono text-xs text-muted-foreground">{shortId}</div>

      {/* Profile */}
      <div className="truncate font-medium">{profileName}</div>

      {/* Competency */}
      <div>
        <Badge variant={COMPETENCY_VARIANTS[fix.competency] ?? 'outline'}>
          {fix.competency}
        </Badge>
      </div>

      {/* Engineer notes preview */}
      <div className="truncate text-muted-foreground">{notesPreview}</div>

      {/* Status */}
      <div>
        <Badge variant={fix.status === 'open' ? 'destructive' : 'default'}>
          {fix.status}
        </Badge>
      </div>

      {/* Related request */}
      <div className="truncate text-muted-foreground">
        {fix.provider_request_id ? (
          <span className="font-mono text-xs">
            {fix.provider_request_id.slice(0, 8)}
          </span>
        ) : (
          '\u2014'
        )}
      </div>

      {/* Created by */}
      <div className="truncate text-muted-foreground">{createdBy}</div>

      {/* Created */}
      <div className="text-muted-foreground">
        {formatDistanceToNow(new Date(fix.created_at), { addSuffix: true })}
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create the fixes list page**

Create `src/app/eng/fixes/page.tsx`:

```typescript
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFixes, type FixFilter } from '@/lib/hooks/eng/use-fixes'
import { FixFilters } from './fix-filters'
import { FixRow } from './fix-row'
import { EmptyState } from '@/components/eng/empty-state'
import { PageLoader } from '@/components/page-loader'

export default function FixesPage() {
  const [filter, setFilter] = useState<FixFilter>({ status: 'open' })
  const { fixes, loading, error } = useFixes(filter)

  // Derive unique profiles for the profile filter dropdown
  const profiles = useMemo(() => {
    const seen = new Map<string, { id: string; display_name: string | null }>()
    for (const fix of fixes) {
      if (fix.profile && !seen.has(fix.profile.id)) {
        seen.set(fix.profile.id, {
          id: fix.profile.id,
          display_name: fix.profile.display_name,
        })
      }
    }
    return Array.from(seen.values())
  }, [fixes])

  if (loading) return <PageLoader />

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fixes</h1>
        <p className="text-sm text-muted-foreground">
          AI work queue — flagged issues for Claude to fix
        </p>
      </div>

      {/* Filters */}
      <FixFilters
        filter={filter}
        profiles={profiles}
        onFilterChange={setFilter}
      />

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      {fixes.length === 0 ? (
        <EmptyState
          heading="No fix requests"
          description={
            filter.status === 'open'
              ? 'No open fix requests. Flag issues from test cases or the pipeline tab.'
              : 'No fix requests match the current filters.'
          }
        />
      ) : (
        <div className="rounded-md border">
          {/* Table header */}
          <div className="grid grid-cols-[90px_1fr_120px_1fr_90px_1fr_1fr_140px] items-center gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div>ID</div>
            <div>Profile</div>
            <div>Competency</div>
            <div>Engineer Notes</div>
            <div>Status</div>
            <div>Request</div>
            <div>Created by</div>
            <div>Created</div>
          </div>

          {/* Rows */}
          {fixes.map((fix) => (
            <FixRow key={fix.id} fix={fix} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify the fixes list page compiles**

```bash
npx tsc --noEmit --pretty
```

---

## Task 9: Fix Request Detail Page

**Files:**
- Create: `src/app/eng/fixes/[fixId]/fix-actions.tsx`
- Create: `src/app/eng/fixes/[fixId]/page.tsx`

- [ ] **Step 1: Create the fix action buttons component**

Create `src/app/eng/fixes/[fixId]/fix-actions.tsx`:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { useFixMutations } from '@/lib/hooks/eng/use-fix-mutations'

interface FixActionsProps {
  fixId: string
  status: string
  onUpdated: () => void
}

export function FixActions({ fixId, status, onUpdated }: FixActionsProps) {
  const { updateFix, loading } = useFixMutations(fixId)

  async function handleResolve() {
    try {
      await updateFix('resolve')
      onUpdated()
    } catch {
      // Error handled in hook
    }
  }

  async function handleReopen() {
    try {
      await updateFix('reopen')
      onUpdated()
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'open' && (
        <Button onClick={handleResolve} disabled={loading}>
          {loading ? 'Resolving...' : 'Mark resolved'}
        </Button>
      )}
      {status === 'resolved' && (
        <Button variant="outline" onClick={handleReopen} disabled={loading}>
          {loading ? 'Reopening...' : 'Reopen'}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the fix request detail page**

Create `src/app/eng/fixes/[fixId]/page.tsx`:

```typescript
'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { useFixDetail } from '@/lib/hooks/eng/use-fix-detail'
import { SourceDataPanel } from '@/components/eng/source-data-panel'
import { ExternalDataPanel } from '@/components/eng/external-data-panel'
import { ExpectedResultsPanel } from '@/components/eng/expected-results-panel'
import { JsonViewer } from '@/components/eng/json-viewer'
import { FixActions } from './fix-actions'
import { PageLoader } from '@/components/page-loader'

const COMPETENCY_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  identification: 'default',
  extraction: 'secondary',
  validation: 'outline',
}

export default function FixDetailPage({
  params,
}: {
  params: Promise<{ fixId: string }>
}) {
  const { fixId } = use(params)
  const { fix, loading, error, refetch } = useFixDetail(fixId)

  if (loading) return <PageLoader />

  if (error || !fix) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-sm text-muted-foreground">
          {error || 'Fix request not found'}
        </p>
        <Button variant="outline" asChild>
          <Link href="/eng/fixes">Back to fixes</Link>
        </Button>
      </div>
    )
  }

  const shortId = fix.id.slice(0, 8)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back nav */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/eng/fixes">
            <ArrowLeft />
            Back to fixes
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight font-mono">
              {shortId}
            </h1>
            <Badge
              variant={
                COMPETENCY_VARIANTS[fix.competency] ?? 'outline'
              }
            >
              {fix.competency}
            </Badge>
            <Badge
              variant={fix.status === 'open' ? 'destructive' : 'default'}
            >
              {fix.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created{' '}
            {formatDistanceToNow(new Date(fix.created_at), {
              addSuffix: true,
            })}
            {fix.created_by_engineer &&
              ` by ${fix.created_by_engineer.email}`}
          </p>
        </div>

        <FixActions fixId={fix.id} status={fix.status} onUpdated={refetch} />
      </div>

      {/* Engineer notes */}
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
          Engineer Notes
        </div>
        <div className="p-4">
          <p className="whitespace-pre-wrap text-sm">{fix.engineer_notes}</p>
        </div>
      </div>

      {/* Links row */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* Profile link */}
        {fix.profile && (
          <Link
            href={`/eng/providers/${fix.profile.provider_id}/${fix.profile_id}/overview`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Profile: {fix.profile.display_name || fix.profile_id}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        {/* Test case link */}
        {fix.test_case && fix.profile && (
          <Link
            href={`/eng/providers/${fix.profile.provider_id}/${fix.profile_id}/test-cases/${fix.test_case_id}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Test case: {fix.test_case.description || fix.test_case_id}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        {/* Related request link */}
        {fix.provider_request && (
          <Link
            href={`/eng/requests/${fix.provider_request_id}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Request: {fix.provider_request_id?.slice(0, 8)}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Data panels */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Source data */}
        {fix.source_data && (
          <div className="rounded-md border">
            <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
              Source Data (Input)
            </div>
            <div className="p-4">
              <SourceDataPanel data={fix.source_data} />
            </div>
          </div>
        )}

        {/* Actual result */}
        <div className="rounded-md border">
          <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
            Actual Result (Wrong)
          </div>
          <div className="p-4">
            <JsonViewer data={fix.actual_result} />
          </div>
        </div>

        {/* Expected result */}
        {fix.expected_result && (
          <div className="rounded-md border">
            <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
              Expected Result
            </div>
            <div className="p-4">
              <ExpectedResultsPanel
                expected={fix.expected_result}
                actual={fix.actual_result}
              />
            </div>
          </div>
        )}
      </div>

      {/* Raw external data */}
      {fix.raw_external && (
        <div className="rounded-md border">
          <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
            Raw External Data
          </div>
          <div className="p-4">
            <ExternalDataPanel data={fix.raw_external} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify the fix detail page compiles**

```bash
npx tsc --noEmit --pretty
```

---

## Task 10: Engineer Context Hook

**Files:**
- Create: `src/lib/hooks/eng/use-eng-context.ts`

The request detail page needs the current user's ID to determine which action buttons to show (e.g., "Assign to me" vs. other actions). This hook provides the current engineer's identity.

- [ ] **Step 1: Create the engineer context hook**

Create `src/lib/hooks/eng/use-eng-context.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createEngBrowserClient } from '@/lib/supabase/eng-client'

interface EngContext {
  userId: string
  email: string
  loading: boolean
}

/**
 * Provides the current engineer's identity from the Supabase session.
 * Used by request detail page to determine action button visibility
 * (e.g., "Assign to me" only shows for the authenticated engineer).
 */
export function useEngContext(): EngContext {
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createEngBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)
        setEmail(user.email ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  return { userId, email, loading }
}
```

- [ ] **Step 2: Verify the hook compiles**

```bash
npx tsc --noEmit --pretty
```

---

## Task 11: Sidebar Badge Updates

**Files:**
- Edit: `src/app/eng/layout.tsx` (created in Plan 3a-2)

The sidebar needs badge counts for Requests (pending count) and Fixes (open count). This task adds the count queries to the existing sidebar layout.

- [ ] **Step 1: Add badge count fetching to the sidebar**

Edit `src/app/eng/layout.tsx` to add counts. Add the following hook and update the sidebar nav items:

```typescript
// Add to the layout component body, after existing hooks:
const [requestCount, setRequestCount] = useState(0)
const [fixCount, setFixCount] = useState(0)

useEffect(() => {
  async function fetchCounts() {
    const supabase = createEngBrowserClient()

    const [requestsResult, fixesResult] = await Promise.all([
      supabase
        .from('provider_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('test_fix_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    ])

    setRequestCount(requestsResult.count ?? 0)
    setFixCount(fixesResult.count ?? 0)
  }

  fetchCounts()
}, [pathname]) // Refresh on navigation
```

Update the sidebar nav items to include badges:

```typescript
// In the sidebar nav links, add badge counts:
// Requests nav item:
{requestCount > 0 && (
  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
    {requestCount}
  </span>
)}

// Fixes nav item:
{fixCount > 0 && (
  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
    {fixCount}
  </span>
)}
```

- [ ] **Step 2: Verify layout compiles with badge counts**

```bash
npx tsc --noEmit --pretty
```

---

## Task 12: Full Integration Verification

- [ ] **Step 1: Verify all new files compile together**

```bash
npx tsc --noEmit --pretty
```

- [ ] **Step 2: Verify route structure is correct**

```bash
# Verify all route files exist
ls -la src/app/eng/requests/page.tsx
ls -la src/app/eng/requests/new-request-modal.tsx
ls -la src/app/eng/requests/request-row.tsx
ls -la src/app/eng/requests/request-filters.tsx
ls -la src/app/eng/requests/\[requestId\]/page.tsx
ls -la src/app/eng/requests/\[requestId\]/request-actions.tsx
ls -la src/app/eng/requests/\[requestId\]/correction-diff.tsx
ls -la src/app/eng/fixes/page.tsx
ls -la src/app/eng/fixes/fix-row.tsx
ls -la src/app/eng/fixes/fix-filters.tsx
ls -la src/app/eng/fixes/\[fixId\]/page.tsx
ls -la src/app/eng/fixes/\[fixId\]/fix-actions.tsx
ls -la src/app/api/eng/requests/route.ts
ls -la src/app/api/eng/requests/\[requestId\]/route.ts
ls -la src/app/api/eng/fixes/\[fixId\]/route.ts
ls -la src/lib/hooks/eng/use-requests.ts
ls -la src/lib/hooks/eng/use-request-detail.ts
ls -la src/lib/hooks/eng/use-request-mutations.ts
ls -la src/lib/hooks/eng/use-fixes.ts
ls -la src/lib/hooks/eng/use-fix-detail.ts
ls -la src/lib/hooks/eng/use-fix-mutations.ts
ls -la src/lib/hooks/eng/use-eng-context.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(eng): add requests queue and fixes (AI work queue) pages

Implements /eng/requests with priority-sorted queue, engineer assignment,
status workflow (pending -> in_progress -> testing -> complete/declined),
and new request modal. Implements /eng/fixes with filtered list, detail
with source/actual/expected/external data panels, and resolve workflow.

API routes for mutations, data hooks for fetching, sidebar badge counts."
```

---

## Summary

| Task | Description | Files | Est. Time |
|------|-------------|-------|-----------|
| 1 | Requests API routes (POST + PATCH) | 2 | 4 min |
| 2 | Fixes API route (PATCH) | 1 | 2 min |
| 3 | Requests data hooks (list, detail, mutations) | 3 | 5 min |
| 4 | Fixes data hooks (list, detail, mutations) | 3 | 4 min |
| 5 | Requests queue list page (filters, row, page) | 3 | 5 min |
| 6 | New request modal | 1 | 3 min |
| 7 | Request detail page (actions, diff, page) | 3 | 5 min |
| 8 | Fixes list page (filters, row, page) | 3 | 5 min |
| 9 | Fix detail page (actions, page) | 2 | 5 min |
| 10 | Engineer context hook | 1 | 2 min |
| 11 | Sidebar badge counts | 1 (edit) | 3 min |
| 12 | Full integration verification | 0 | 3 min |
| **Total** | | **26 files** | **~46 min** |

### Key Design Decisions

1. **Priority sorting in the hook, not the DB** -- The priority tiers require knowledge of profile status (active vs. draft) which comes from a join. Sorting in JS after fetch keeps the query simple and the logic readable.

2. **API routes for mutations, hooks for reads** -- Mutations go through `/api/eng/` routes which use the server-side Supabase client with engineer verification. Reads use the browser eng client directly for simplicity.

3. **Fix creation is NOT in this plan** -- Per the spec, fix requests are created from the provider pages (test cases tab "Flag for fix" and pipeline tab "Flag for fix") in Plan 3a-3. This plan only displays and manages them.

4. **Shared panel primitives reused** -- Fix detail page uses `SourceDataPanel`, `ExternalDataPanel`, `ExpectedResultsPanel`, and `JsonViewer` from Plan 3a-2, same as test case detail views.

5. **Short IDs for fixes** -- The fix ID is displayed as the first 8 chars of the UUID for easy verbal/text reference when telling Claude "Fix test_fix_request abc12345".
