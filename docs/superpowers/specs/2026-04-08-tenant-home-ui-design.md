# Tenant Home UI — Role-Based Branching

## Summary

Show tenant-only users a simple greeting page instead of the landlord dashboard. Users with any landlord properties continue to see the existing UI unchanged.

## Approach

Branch inside `HomeContent` based on whether the user has landlord properties. No new routes, queries, or data fetching — uses the existing `homeProperties` data which already includes `role` per property.

## Changes

### `src/app/app/(main)/home-content.tsx`

Check if the user has any properties with `role === 'landlord'`. If not, render `TenantHomeContent` instead of the existing landlord UI.

### `src/app/app/(main)/tenant-home-content.tsx` (new)

Simple component that shows a greeting with the user's first name. Placeholder for future tenant onboarding/dashboard work.

Receives `firstName?: string` as a prop.

## What We're Not Building

- Tenant-specific property cards or navigation
- Tenant onboarding steps
- Role-based routing or separate layouts
- Anything beyond a greeting

## Testing

- Verify existing landlord home page renders unchanged
- Verify tenant-only user sees the greeting
- Build passes
