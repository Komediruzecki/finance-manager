---
name: gh
description: GitHub CLI skill for listing issues, viewing issue details, and managing GitHub interactions
type: skill
---

# GitHub CLI Skill

## Usage

When the user provides a GitHub issue URL or asks to:
- List open issues
- View issue details
- Create/maintain issues

Use this skill to interact with GitHub via `gh` CLI.

## Available Commands

```bash
# List all issues (open)
gh issue list --state open --limit 10

# List issues for a specific repo (from context)
gh issue list --repo Komediruzecki/finance-manager --state open --limit 10

# View an issue by number
gh issue view 123

# View an issue from URL (extract ID)
gh issue view 123

# Create a new issue
gh issue create --title "..." --body "..."

# List labels on an issue
gh issue view 123 --json labels,title,body
```

## Key Context

Repository: `Komediruzecki/finance-manager`

## Error Handling

- If `gh` is not installed, inform the user they need to install it: `sudo apt install gh`
- If the repository URL doesn't match, extract `owner/repo` from the URL
- Cache recent issues to avoid repeated API calls