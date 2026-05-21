```markdown
# npb-predictions Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `npb-predictions` TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns, providing step-by-step guidance and example commands for common workflows. This is ideal for contributors looking to maintain consistency and quality in the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `playerStats.ts`, `gameResults.ts`

### Import Style
- Use **alias imports** to reference modules.
  - Example:
    ```typescript
    import { predictOutcome as predict } from './predictor';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In predictor.ts
    export function predictOutcome(data: GameData): Prediction { ... }
    ```

### Commit Messages
- Follow **conventional commit** standards.
- Use the `fix` prefix for bug fixes.
- Keep commit messages concise (average 47 characters).
  - Example:
    ```
    fix: correct team ranking calculation logic
    ```

## Workflows

### Fix a Bug
**Trigger:** When a bug is identified and needs to be resolved  
**Command:** `/fix-bug`

1. Create a new branch for the fix.
2. Make code changes following the coding conventions.
3. Write or update relevant tests (`*.test.ts`).
4. Commit with a message starting with `fix:`.
5. Push the branch and open a pull request.

### Add a New Feature
**Trigger:** When implementing a new feature  
**Command:** `/add-feature`

1. Create a new branch for the feature.
2. Add new files using camelCase naming.
3. Use alias imports and named exports.
4. Write corresponding tests.
5. Commit changes with a descriptive message.
6. Push and open a pull request.

### Run Tests
**Trigger:** Before pushing changes or opening a pull request  
**Command:** `/run-tests`

1. Ensure all test files follow the `*.test.*` pattern.
2. Run the test suite using the project's test runner.
3. Fix any failing tests before proceeding.

## Testing Patterns

- Test files are named with the `*.test.*` pattern (e.g., `predictor.test.ts`).
- The testing framework is not specified; use the project's configured test runner.
- Place tests alongside the modules they cover or in a dedicated test directory.
- Example test structure:
  ```typescript
  // predictor.test.ts
  import { predictOutcome } from './predictor';

  describe('predictOutcome', () => {
    it('should return correct prediction', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command      | Purpose                                      |
|--------------|----------------------------------------------|
| /fix-bug     | Start the bug fix workflow                   |
| /add-feature | Begin the process to add a new feature       |
| /run-tests   | Execute the project's test suite             |
```
