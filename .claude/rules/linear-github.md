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
| Draft PR opened | **In Progress** |
| PR moved out of draft (ready for review) | **In Review** |
| PR merged | **Done** |

## Starting a Feature

When beginning work on a Linear issue:

1. Create the feature branch (e.g., `brandon/PRO-123-short-description`)
2. Push the branch to remote (`git push -u origin <branch>`)
3. Create a **draft PR** immediately (`gh pr create --draft`)

This moves the Linear issue to **In Progress**. The draft PR serves as the living workspace for the feature — commits are pushed to it throughout development. When the feature is ready for review, move the PR out of draft status to trigger the **In Review** transition in Linear.

## Rules

- Every feature branch must reference a Linear issue ID
- Do not create branches or PRs without a corresponding Linear issue
- Use the team prefix `PRO` (e.g., `PRO-123`)
- When a PR addresses multiple issues, list each with a magic word
