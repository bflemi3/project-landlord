# Database Migrations

## Safety Rules

- Migrations must be **additive and non-destructive** by default
- Never drop tables, columns, or constraints without explicit approval
- Never modify or delete existing data in a migration
- Never rename columns — add a new column, migrate data, then deprecate the old one (in separate PRs)
- RLS policy additions are safe — they don't touch data
- Index additions are safe but may lock tables briefly on large datasets

## Before Writing a Migration

- Check existing migrations in `supabase/migrations/` for naming conventions and patterns
- Verify the change is compatible with the current production schema
- If the migration alters an existing table, confirm no running queries or application code depends on the old shape

## Migration Naming

```
YYYYMMDDHHMMSS_short_description.sql
```

Example: `20260401120000_charge_instances_delete_policy.sql`

## Production Deployment

- Migrations are applied to production via `npx supabase db push --linked`
- This runs after the PR is merged to `main`
- Migrations run in filename order — never rename or reorder existing migration files
- Test migrations against local Supabase before merging

## Destructive Operations Require

If a migration must drop, rename, or alter existing structures:

1. Explicit approval from the project owner
2. A rollback plan documented in the migration file as a comment
3. Data backup verification before applying to production
4. Two-phase approach: deprecate first, remove in a later PR after confirming nothing depends on it
