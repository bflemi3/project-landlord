# Server Caching Investigation — Design Spec

## Problem

The performance optimization refactor (2026-04-09) planned to use `'use cache'` + `cacheLife()` on server data fetchers and `cacheComponents: true` in next.config.ts. Both were removed during implementation because they're incompatible with the current stack:

1. **`'use cache'` + Supabase:** Server data fetchers call `createClient()` which calls `cookies()` for auth. `'use cache'` forbids dynamic APIs (`cookies()`, `headers()`) inside its scope.

2. **`cacheComponents` + next-intl:** The root layout calls `getLocale()` and `getMessages()` which read request headers/cookies. `cacheComponents` requires all dynamic data inside Suspense boundaries, but the root layout can't be Suspense-wrapped.

## Impact

Without server-side caching:
- Every navigation to a streaming server component re-queries Supabase (even for identical data)
- Repeated visits to the same property/statement page always hit the DB
- Back navigation relies solely on React Query's client-side cache (fast, but cold on first visit)

The structural wins from the refactor (static layout, streaming, Suspense, loading.tsx) already make navigation feel significantly faster. Server caching would reduce TTFB for warm cache hits.

## Investigation Areas

### 1. `'use cache'` with service-role Supabase client

**Approach:** Read the user ID outside the cached function (from middleware or a parent server component), pass it as a parameter. Inside the cache, use a service-role client that doesn't need cookies.

```tsx
export async function getProperty(id: string, userId: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag(`property-${id}`)
  const supabase = createServiceClient()
  // Option A: bypass RLS, manually verify access
  // Option B: use RLS with set_config('request.jwt.claims', ...)
  return fetchProperty(supabase, id)
}
```

**Questions to resolve:**
- Can we safely bypass RLS and verify access in application code? What's the security model?
- Can we set RLS context on a service-role client to maintain row-level security?
- How does the userId parameter affect cache key granularity? (per-user cache vs shared cache)
- What's the cache invalidation story with `cacheTag()`?
- Does this work with Supabase's connection pooler?

### 2. `cacheComponents` with next-intl

**Approach:** Move all locale detection to middleware (already partially done — locale cookie is set). Make `getLocale()` read from a static source that `cacheComponents` considers non-dynamic.

**Questions to resolve:**
- Can next-intl be configured to read locale from a cookie set by middleware without calling dynamic APIs in the layout?
- Does `next-intl` have a static/build-time locale mode?
- Is there a Suspense-compatible pattern for loading messages?

### 3. Alternative: unstable_cache or React.cache

If `'use cache'` can't work with our auth model, explore:
- `unstable_cache` (if still available in Next 16) with explicit cache keys
- `React.cache()` for request-level deduplication (already used pre-refactor)
- Custom in-memory LRU cache for hot data

## Success Criteria

- Server data fetchers return cached results for repeated requests within the cache window
- Cache is per-user (authenticated data must not leak between users)
- RLS security guarantees are preserved
- Cache invalidation works via `revalidateTag()` in server actions
- No regression in auth flow or data access control

## Non-Goals

- Caching public/anonymous data (not relevant — all cached routes are authenticated)
- CDN-level caching (Vercel handles this separately)
- Replacing React Query client-side caching
