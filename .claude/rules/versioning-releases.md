# Versioning, Releases, and Changelog

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`
- `MAJOR` — breaking or milestone releases
- `MINOR` — new features
- `PATCH` — bug fixes, small improvements

## Key Rule: Changelog Inside the Feature PR

Changelog and version bump happen **inside the feature PR** — not as a separate commit after merge. This ensures only one Vercel deployment per release.

## Release Workflow

1. Update `CHANGELOG.md` with the new version entry
2. Bump `version` in `package.json`
3. Commit as part of the feature branch
4. Push and create PR
5. Merge PR to `main`
6. If new Supabase migrations: `npx supabase db push --linked`
7. Tag: `git tag vX.Y.Z`
8. Push tag: `git push origin vX.Y.Z`
9. Create release: `gh release create vX.Y.Z --title "vX.Y.Z — Short description" --generate-notes`

## Changelog Conventions

- `CHANGELOG.md` at project root is the single source of truth for release notes
- Write entries for **lay users** (e.g., "Install mabenn to your home screen" not "PWA support with Serwist")
- Each version: `## vX.Y.Z` heading + bullet points
- Update `CHANGELOG.md` **before** bumping `package.json` version

## Update Notification Pipeline

- `next.config.ts` parses `CHANGELOG.md` at build time → `NEXT_PUBLIC_APP_VERSION` + `NEXT_PUBLIC_RELEASE_NOTES`
- `SwUpdateNotifier` shows a toast with release notes when the service worker activates an update
- `/changelog` route renders full `CHANGELOG.md` with `react-markdown`

Create a **GitHub Release** for each feature PR merged to `main`.
