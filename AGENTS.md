# Repository Agent Instructions

This repository hosts a Next.js + Supabase PWA. Refer to the documentation in `specifications/` for project specs and `.github/copilot-instructions.md` for more guidance.

## Coding and Commit Rules

- Write all commit messages in Japanese using the format `<type>(<scope>): <summary>`.
  - `type`: feat, fix, docs, style, refactor, test, chore
- Keep commits small and focused.
- Run `npm run lint` for ESLint/Prettier checks before committing.
- Ensure API documentation via JSDoc comments remains up-to-date.

## Testing

- Run unit tests with `npm run test:ci`.
- Run E2E tests with `npm run e2e` (or `npm run test:e2e` when appropriate).
- When SQL or migrations change, execute `supabase test db`.
- All tests must pass and have no TypeScript or lint errors before commit.

## Pull Requests

- Follow Git Flow naming: `feature/*`, `bugfix/*`, `release/x.y.z`, etc.
- PR titles follow `[<type>] <branch>: <summary>` and bodies describe background, changes, test steps and related issues.
- Use Squash and merge after CI success.

## Additional Notes

- Remove unused code or comments.
- Update documentation if implementing features beyond the spec.
- Ask questions if the spec is unclear or cannot be met.
- Summaries in PR descriptions and final responses should be written in Japanese.

---
These rules apply to the entire repository.
