# Copilot Instructions for `bruno-converters`

## Build, lint, and run

- Install deps: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build (includes Next.js type-check step): `npm run build`
- Production server: `npm run start`

No automated test runner is configured in `package.json` yet (`npm test` / single-test commands are not available).

For targeted linting on one file, run:

- `npx eslint app/page.tsx`

## High-level architecture

- The app is a Next.js App Router project with one primary UI screen in `app/page.tsx` (`"use client"`).
- Conversion flow is split by source type:
  - **Client-side conversion** for Insomnia, OpenAPI, and WSDL.
  - **Server fallback** for Postman via `POST /api/convert` in `app/api/convert/route.ts`.
- The server fallback exists because Postman converter bundling pulls Node-only dependencies in browser builds; keep Postman conversion out of client bundle paths.
- Bruno converter package typing is provided locally in `types/usebruno-converters.d.ts` for imports that do not ship first-party TypeScript declarations.

## Key repository conventions

- **Next.js version caution**: follow `AGENTS.md` / `CLAUDE.md` guidance — this repo targets modern Next.js behavior; consult docs under `node_modules/next/dist/docs/` when implementing framework-specific changes.
- **Theme and typography**:
  - Catppuccin Mocha-inspired palette is defined in `app/globals.css` and used directly in component class names.
  - JetBrains Mono is loaded in `app/layout.tsx` via `next/font/google` and wired through CSS variables.
- **Converter routing convention**:
  - Keep `SourceType` handling centralized in `app/page.tsx`.
  - Validate/parse source input before conversion (`JSON.parse`, OpenAPI YAML fallback via `js-yaml`).
  - When adding a new source type, update both UI selection and conversion branch logic consistently.
