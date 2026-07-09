# Frontend Audit Report — prototype-qc

Branch: `sina/frontend-audit` · Date: 2026-07-09 · Auditor: automated staff-engineer pass (Claude)

# Executive Summary

The QC check-in prototype (React 19 + Vite 8 + Takeoff UI) is visually faithful to the Figma
reference and functionally sound: all primary flows (flight selection, date picking, passenger
selection, check-in overlay, pool creation, seat map, collapse/expand) work with **zero console
errors or warnings**. The audit found no broken functionality, but several production-readiness
gaps: no TypeScript checking at all, a 6.3 MB JavaScript bundle, the brand font never actually
loading for end users, and repository hygiene issues. All of these are fixed on this branch.
The production bundle is now **841 kB (199 kB gzip), an 87 % reduction**, and `npm run typecheck`
passes under `strict`.

# Project Architecture

- Single-page app: `src/main.tsx` mounts `FlightSearchPage` (src/features/cargo/FlightSearchPage.tsx, ~3,540 lines).
- Styling: one hand-tuned stylesheet (`src/styles.css`, ~1,120 lines) with CSS variables for
  color/motion tokens and breakpoints at 1240 / 1440–1450 / 1800 px plus height queries.
- Design system: Takeoff UI web components (`tk-*`) registered per-component via
  `defineCustomElement`, wrapped with thin local React adapters. Material Symbols Rounded for icons.
- No router, no server/API layer — all data is deterministic seeded mock data (intended for a prototype).

# Frontend Issues Found

1. **No TypeScript toolchain** — no `tsconfig.json`, no `typescript` dependency; Vite/esbuild strips
   types without checking. 8 latent type errors existed, 2 of them real logic-typing bugs.
2. **6.3 MB bundle (2.24 MB gzip)** — `import { TkDatepicker } from "@takeoff-ui/react"` pulls the
   package barrel, which registers *every* Takeoff component (charts, rich-text editor, gantt,
   org-chart, carousel…).
3. **Brand font never loaded** — `font-family: "Geologica", …` but no `@import`/`<link>` for it.
   It rendered only on machines with Geologica installed locally; everyone else got Segoe UI/Arial.
   A direct Figma-fidelity defect (typography).
4. **Dead `@tailwind` directives** — Tailwind is not installed; the three directives shipped to the
   browser as invalid CSS.
5. **Unpinned dependencies** — `react`, `react-dom`, `vite`, `@vitejs/plugin-react`,
   `@takeoff-ui/core` were all `"latest"`, making builds non-reproducible.
6. **Keyboard trap in collapsed sidebar** — the flight list used `aria-hidden` when collapsed but
   its buttons/inputs stayed in the tab order (WCAG 2.1 AA violation: focus on hidden content).
7. **Invalid ARIA** — `aria-expanded` on a non-interactive `<aside>` (seat map).
8. **Repo hygiene** — `dist/` build artifacts, `.pnpm-store/v11/index.db`, and `.DS_Store` files
   were tracked in git despite `.gitignore`.

# UI Fixes

None required — rendered output matches the reference (`artifacts/qc-reference-match.png`) at the
supported breakpoints. No layout, spacing, color, or component-geometry changes were made,
in line with the "do not redesign" constraint.

# UX Improvements

No behavioral changes. All existing interactions verified working: date picker (open, select,
close), flight search filter + empty state ("Uçuş bulunamadı"), passenger select → floating action
bar → check-in overlay → processing → success state, seat selection with `aria-live` status.

# Accessibility Improvements

- Collapsed flight sidebar is now `inert`, removing hidden controls from tab order and the
  accessibility tree (previously `aria-hidden` only).
- Removed invalid `aria-expanded` from the seat-map `<aside>` (kept on its toggle button, where it is valid).
- Existing good practices confirmed: 110+ `aria-*` attributes, visible `:focus-visible` outlines,
  `prefers-reduced-motion` support, `aria-live` seat-selection status, dialog roles on overlays.

# Responsive Improvements

Verified at 1280, 1920 and 2000 px: no overflow, clipping, or overlapping content. The app enforces
`min-width: 1180px` with horizontal scrolling below that — appropriate for an agent desktop console;
see Remaining Issues for the mobile stance.

# Performance Optimizations

- **Bundle: 6,353 kB → 841 kB (gzip 2,241 kB → 199.5 kB)** by replacing the `@takeoff-ui/react`
  barrel import with a local `createComponent` wrapper that loads only `tk-datepicker`
  (mirrors the library's own generated code, so behavior and typings are identical).
- Geologica loads with `display=swap`, so text renders immediately during font load.

# Design System Improvements

- Takeoff UI usage kept as primary system (`@takeoff-ui/core` 0.11.x + per-component registration).
  No new components introduced; no duplicates created.

# Figma Alignment Changes

- Typography: Geologica 300–800 now ships to all users (previously only rendered for
  machines with the font installed). No other deltas found between implementation and the
  reference capture.

# Refactors

Deliberately minimal. The 3,540-line single-file page works and is pixel-tuned; splitting it was
judged higher-risk than value for this pass (see Recommendations).

# Files Modified

- `package.json` / `package-lock.json` — pinned versions, `typecheck` script, dev-deps (typescript, @types/react, @types/react-dom)
- `tsconfig.json` — new (strict, ES2022, bundler resolution)
- `src/features/cargo/FlightSearchPage.tsx` — datepicker import fix, type annotations, `inert`, ARIA fix
- `src/styles.css` — Geologica import, removed dead `@tailwind` directives
- `.gitignore` — added `.pnpm-store`, `.DS_Store`; untracked `dist/`, caches
- `FRONTEND-AUDIT.md` — this report

# Remaining Issues

1. **Dual package managers** — both `package-lock.json` and `pnpm-lock.yaml`/`pnpm-workspace.yaml`
   are committed. Pick one (deploy config on Railway decides) and delete the other lockfile.
2. **Passenger table semantics** — the main list is a CSS-grid of `div`/`span` without
   `role="table"/row/cell"` (the baggage table has them). A proper fix needs markup restructuring
   because the CSS keys on `.table-head > span` child selectors; do it together with a visual
   regression test.
3. **Below 1180 px** the app horizontally scrolls by design. If tablet/mobile support is a real
   requirement, it needs a designed adaptation, not CSS shrinking.
4. **Icon-font FOUT** — Material Symbols can flash ligature text on first cold load; consider
   `font-display: block` via self-hosting.
5. Some toolbar buttons ("Filter", settings) are non-functional prototype stubs — expected at this
   stage, but they should get disabled states or handlers before release.

# Recommendations

- Split `FlightSearchPage.tsx` by feature (sidebar, flight info, passenger table, seat map,
  overlays) once a visual-regression harness (e.g. Playwright screenshots) exists.
- Add ESLint (`eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`) and CI running
  `typecheck`, `lint`, `build`.
- Self-host fonts for offline airport-network resilience.
- Add `build.rolldownOptions` code-splitting if the app grows beyond one screen.

# Risk Assessment

All changes are low-risk: the datepicker wrapper byte-mirrors the library's generated adapter
(verified interactively — open, select date, close); font/ARIA/hygiene changes don't affect layout;
dependency pins match the exact versions already installed in `node_modules`. Verified after
changes: `tsc --noEmit` clean, production build clean, zero console errors, all primary flows
exercised in-browser at 1280/1920/2000 px.
