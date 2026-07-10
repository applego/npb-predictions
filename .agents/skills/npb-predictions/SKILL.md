```markdown
# npb-predictions Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns and workflows used in the `npb-predictions` TypeScript codebase. The repository focuses on Japanese professional baseball predictions, with an emphasis on robust API route handling and a user-friendly drag-and-drop interface for predictions. You'll learn the project's coding conventions, how to contribute to key workflows, and how to write and run tests.

## Coding Conventions

**File Naming**
- Use `camelCase` for file names.
  - Example: `cronAuth.ts`, `updateStandings.ts`

**Import Style**
- Use alias imports for modules.
  - Example:
    ```typescript
    import { getCronAuth } from '@/lib/cron-auth';
    ```

**Export Style**
- Use named exports.
  - Example:
    ```typescript
    export function getCronAuth() { ... }
    ```

**Commit Messages**
- Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes like `fix`, `docs`, or `chore`.
  - Example: `fix: improve error handling in update-standings cron route`

## Workflows

### API Cron Route Hardening
**Trigger:** When you need to fix bugs, improve error reporting, or adapt environment variable access in scheduled (cron) API endpoints.  
**Command:** `/harden-cron-api`

1. Identify the issue in one or more cron API routes (e.g., environment variable access, error handling, database limits).
2. Edit the relevant file(s) under `web/src/app/api/cron/*/route.ts` to address the problem.
   - Example:
     ```typescript
     // web/src/app/api/cron/update-standings/route.ts
     import { getCronAuth } from '@/lib/cron-auth';

     export async function POST(req: Request) {
       try {
         const auth = getCronAuth(req);
         // ...cron logic
       } catch (error) {
         console.error('Cron error:', error);
         return new Response('Internal Server Error', { status: 500 });
       }
     }
     ```
3. Optionally, add or update a shared helper in `web/src/lib/` (e.g., `cron-auth.ts`).
4. Commit your changes with a detailed message referencing the specific cron route(s) affected.

**Files Involved:**
- `web/src/app/api/cron/recalculate/route.ts`
- `web/src/app/api/cron/update-games/route.ts`
- `web/src/app/api/cron/update-standings/route.ts`
- `web/src/app/api/cron/update-titles/route.ts`
- `web/src/lib/cron-auth.ts`

---

### Drag-and-Drop UI Enhancement
**Trigger:** When you want to improve how users interact with draggable cards in the predictions creation page.  
**Command:** `/improve-dnd-ui`

1. Receive user feedback or identify a usability issue with drag-and-drop.
2. Edit `web/src/app/predictions/new/page.tsx` to update drag handle logic, accessibility labels, or visual feedback.
   - Example:
     ```tsx
     // web/src/app/predictions/new/page.tsx
     <div
       role="button"
       aria-label="Drag to reorder"
       tabIndex={0}
       className="drag-handle"
       // ...drag logic
     >
       <DragIcon />
     </div>
     ```
3. Commit your changes, referencing co-authors or user reports if applicable.

**Files Involved:**
- `web/src/app/predictions/new/page.tsx`

---

## Testing Patterns

- Test files follow the `*.test.*` naming pattern.
  - Example: `predictionUtils.test.ts`
- The testing framework is not explicitly specified; check the project for setup details.
- Place test files alongside the code they test or in a dedicated test directory.

**Example Test File:**
```typescript
// predictionUtils.test.ts
import { calculateStandings } from './predictionUtils';

describe('calculateStandings', () => {
  it('returns correct standings for sample input', () => {
    const result = calculateStandings(sampleGames);
    expect(result).toEqual(expectedStandings);
  });
});
```

## Commands

| Command           | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| /harden-cron-api  | Harden and improve error handling in cron API endpoints      |
| /improve-dnd-ui   | Enhance drag-and-drop usability in the predictions UI        |

## Screenshot Delivery

Default destination for screen verification screenshots is Discord. Do not
commit webhook URLs into the repository. Load the local secret before sending:

```bash
set -a
source "$HOME/.config/npb-predictions/screenshot-discord-webhook.env"
set +a
curl -F "content=NPB Predictions screen verification" \
  -F "files[]=@/absolute/path/to/screenshot.png" \
  "$NPB_SCREENSHOT_DISCORD_WEBHOOK_URL"
```

Use this default for desktop/mobile Playwright screenshots unless the user
specifies a different recipient.
```
