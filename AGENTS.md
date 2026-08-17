<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Burntato App

- This repository is the mobile-first Burntato interface.
- The current product slice is visual-only. Do not add wallet, RPC, or contract behavior unless the user explicitly authorizes the connected phase.
- Preserve the supplied reference artwork under `public/reference/`; the Grab and Burn hero regions intentionally clip the original mockups to retain exact character rendering.
- Run `npm run verify` after source changes. Validate visual changes in a real browser at 390x693 and at least one taller mobile viewport.
