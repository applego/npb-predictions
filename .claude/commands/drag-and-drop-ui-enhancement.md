---
name: drag-and-drop-ui-enhancement
description: Workflow command scaffold for drag-and-drop-ui-enhancement in npb-predictions.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /drag-and-drop-ui-enhancement

Use this workflow when working on **drag-and-drop-ui-enhancement** in `npb-predictions`.

## Goal

Enhance the drag-and-drop experience in the predictions UI, often in response to user feedback about usability or accessibility.

## Common Files

- `web/src/app/predictions/new/page.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Receive user feedback or identify a usability issue with drag-and-drop.
- Edit web/src/app/predictions/new/page.tsx to update drag handle logic, accessibility labels, or visual feedback.
- Commit changes, sometimes referencing co-authors or user reports.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.