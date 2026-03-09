# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the frontend application. Use `pages/` for routed screens, `components/landing`, `components/shared`, `components/admin`, and `components/viewer` for feature UI, and `components/ui` for shadcn/ui primitives. Put shared logic in `lib/`, reusable hooks in `hooks/`, translations in `i18n/`, and generated Supabase client/types in `integrations/supabase/`. Static files belong in `public/` or `src/assets/`. Supabase migrations and edge functions live under `supabase/migrations/` and `supabase/functions/`.

## Build, Test, and Development Commands
Prefer `npm`; the repo includes `package-lock.json` and the README uses npm-based setup.

- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server.
- `npm run build` creates the production bundle in `dist/`.
- `npm run build:dev` builds with development mode settings.
- `npm run preview` serves the latest build locally.
- `npm run lint` runs ESLint across the codebase.
- `npm test` runs Vitest once.
- `npm run test:watch` starts Vitest in watch mode.

## Coding Style & Naming Conventions
Follow the existing TypeScript + React style: functional components, 2-space indentation, semicolons, and double quotes. Use the `@/` alias for internal imports instead of long relative paths. Name components and pages in `PascalCase` (`AdminDashboard.tsx`), hooks and utilities in `camelCase` (`useScrollReveal.ts`, `pdfGenerator.ts`), and shadcn/ui primitive files in `kebab-case` (`alert-dialog.tsx`). Keep route-specific code close to its page and avoid editing generated Supabase files unless you are intentionally regenerating them.

## Testing Guidelines
Vitest is configured with `jsdom` and Testing Library via `src/test/setup.ts`. Place tests under `src/` using `*.test.ts` or `*.test.tsx` so they match `vitest.config.ts`. There is no enforced coverage threshold yet, so add focused tests whenever you change routing, context/store behavior, form flows, or utility logic. Prefer user-visible assertions over implementation details.

## Commit & Pull Request Guidelines
The repository currently has no commit history, so there is no established convention to copy. Start with short, imperative subjects; Conventional Commit prefixes are a good default, for example `feat: add admin coupon filters` or `fix: guard missing Supabase env vars`. Keep pull requests focused, summarize user impact, list the commands you ran, link related issues, and include screenshots or short recordings for UI changes. Call out schema, migration, or environment-variable changes explicitly.

## Security & Configuration Tips
Keep secrets in `.env` and do not commit real Supabase credentials. When changing `supabase/functions/` or `supabase/migrations/`, document rollout steps in the PR so frontend and backend changes stay aligned.
