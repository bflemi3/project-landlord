# Linear + GitHub Integration

## Branch Naming

Include the Linear issue identifier in the branch name:

```
username/PRO-123-short-description
```

Examples: `brandon/PRO-42-add-tenant-invite-flow`, `feature/PRO-123-fix-statement-publishing`

The identifier is case-insensitive. It must appear somewhere in the branch name.

## PR Titles

```
PRO-123: Description of changes
```

## PR Descriptions

Use magic words to link issues:

```
Closes PRO-123
Fixes PRO-123
Resolves PRO-123
```

## Automatic Status Transitions

| Git/PR Event | Linear Status |
|---|---|
| Branch created with issue ID | **In Progress** |
| PR opened | **In Review** |
| PR merged | **Done** |

## Rules

- Every feature branch must reference a Linear issue ID
- Do not create branches or PRs without a corresponding Linear issue
- Use the team prefix `PRO` (e.g., `PRO-123`)
- When a PR addresses multiple issues, list each with a magic word
