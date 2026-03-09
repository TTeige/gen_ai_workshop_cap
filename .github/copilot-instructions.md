# Workshop Prompt Logging Instructions

## Purpose
Maintain an append-only history of prompts and responses so workshop teams can compare prompting strategies and outcomes.

## Required Logging Behavior
For every user message in Agent mode, append one new entry to:
`.github/workshop-prompt-log.md`.

Do not overwrite or rewrite previous entries. Always append.

## Entry Format
Use this exact structure for each appended entry:

```markdown
## Timestamp: <ISO-8601 UTC timestamp>
### User Input
<verbatim user request>

### Agent Reasoning (Brief)
- <1-3 concise bullets describing approach and key decisions>

### Summary
<2-4 sentence summary of what was done or planned>
```

## Rules
- Keep `User Input` as close to verbatim as possible.
- Keep `Agent Reasoning (Brief)` concise and high level.
- Keep summaries short and outcome-focused.
- If no file changes were made, still append an entry and state that in `Summary`.
