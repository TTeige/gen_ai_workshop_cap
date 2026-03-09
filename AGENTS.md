# Agent Instructions (Repository Root)

These instructions apply to all coding agents used in this repository (not only GitHub Copilot).

## Purpose
Track how each participant prompts their agent during the workshop so outcomes can be compared later.

## Required Logging Behavior
For every user instruction, append one new log entry to:
`.github/workshop-prompt-log.md`

The log is append-only. Never delete, rewrite, or reorder existing entries.

## Required Entry Format
Use this exact structure:

```markdown
## Timestamp: <ISO-8601 UTC timestamp>
### User Input
<verbatim user request>

### Agent Reasoning (Brief)
- <1-3 concise bullets with high-level reasoning>

### Summary
<2-4 sentence summary of what was done or planned>
```

## Rules
- Keep `User Input` as close to verbatim as possible.
- Keep `Agent Reasoning (Brief)` concise and high level.
- Keep `Summary` short and outcome-focused.
- If no code or file changes were made, still append an entry and state that explicitly.
