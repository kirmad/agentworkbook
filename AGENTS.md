# AGENTS.md

## Build, Lint, and Test Commands
- **Build (dev):** `yarn compile` (webpack)
- **Build (prod):** `yarn package`
- **Lint:** `yarn lint` (ESLint on src)
- **Test:** `yarn test` (runs node ./out/test/runTest.js)
- **Pretest:** `yarn compile-tests && yarn compile && yarn lint`
- **Run single test:** Use Mocha directly or modify `runTest.js` for single test execution.

## Code Style Guidelines
- **Imports:** Use camelCase or PascalCase for import names.
- **Formatting:** Always use semicolons; require curly braces; use strict equality (`===`).
- **Types:** TypeScript is used; type annotations encouraged. Strict mode is off, but prefer explicit types.
- **Naming:** Imports must be camelCase or PascalCase. Use descriptive names for functions, classes, and variables.
- **Error Handling:** Do not throw literals; always throw Error objects.
- **Modules:** Use ES2022/Node16 modules. Source code in `src/`, renderer in `src/renderer/`.
- **Linting:** ESLint with @typescript-eslint. Fix warnings before commit.
- **Comments:** Follow standard TypeScript/ESLint practices for documentation and inline comments.

No Cursor or Copilot rules are present in this repository.
