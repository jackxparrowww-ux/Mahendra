# Mahendra Real Estate

The complete source for the professional construction website and contractor/supervisor/client workspace originally built in ChatGPT Sites. React/Vinext application, server API routes, D1 SQL migrations and R2 file storage are included.

## Implemented

- Public portfolio of completed homes/societies, actual uploaded project cover photos and enquiry capture.
- Project assignment and server-enforced contractor, supervisor and client permissions.
- Itemised quotations, agreements, supplier/material expenses, labour attendance, advances, wages and client instalment balances.
- Browser Print / Save PDF for estimates, agreement records and payment receipts/statements.
- Private/shared project documents with a 10 MB per-file limit, content signature checks and controlled downloads.
- Contractor-only record history with before/after snapshots of record edits and deletions.
- Exact integer-paise monetary values, deterministic estimate rounding, validated calendar dates and enquiry throttling.
- Separate temporary sample workspace. Sample projects and photos do not imply real construction work by this business.

## Runtime and hosting

**This is a Cloudflare Worker-backed ChatGPT Sites application. It is not a static Vite export and cannot run its backend on a plain Vercel static deployment.** D1, R2 and the Sites authentication gateway are required for the current production architecture. The prior standalone frontend prototype is retained in Git history.

The gateway supplies verified `oai-authenticated-user-*` headers and owns the sign-in routes. Do not expose a raw Worker endpoint that trusts client-supplied identity headers. Migrating to standalone Cloudflare or Vercel requires a supported authentication provider and a database/storage adapter; that migration is not implemented here.

`.openai/hosting.json` retains the existing Site identity and `DB`/`BUCKET` bindings. Sites provisions those resources and applies tracked migrations when publishing. Do not change its project ID for this existing Site.

## Install, verify and develop

Node.js 24+, Corepack/pnpm 11.25.0:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm build
```

For portable local development, copy `.dev.vars.example` to `.dev.vars`, build once, then apply each SQL migration once to the local D1 database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fantastic_mantis.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_fine_pandemic.sql
pnpm dev
```

Use the localhost URL printed by the server. Portable development has a loopback-only mock sign-in account (`seedy@sites.test`). It is not included in production builds. Managed Work environments must use the supported Sites preview workflow instead.

## Owner setup and team access

Before first production setup, configure `WORKSPACE_OWNER_EMAIL` in the hosting runtime to the intended owner's real sign-in email, then deploy. Only that account can initialise an empty workspace. Once initialised, the stable signed-in user ID determines ownership.

Sign in, initialise the business, add a project and then its records. Upload project images under Documents and select an uploaded image when editing the project. A cover is public only after a completed project is explicitly marked for portfolio display.

Team & access adds email-bound project assignments. It does not send invitation emails. The current Site is owner-private; external client and supervisor sign-in requires the platform's audience/sharing controls to be configured. Application-level membership checks remain enforced regardless of audience.

## Verification and release status

Local type checking, production build and automated workflow tests verify calculations, SQL migrations, owner setup restrictions, persisted records, permissions, project isolation, document sharing, uploaded content signatures, explicit public covers, audit history, date/precision validation, cross-origin checks and enquiry limits. The workflow test uses SQLite plus mocked identity/R2; it does not prove hosted identity or R2 integration. GitHub Actions repeats type checks, workflow tests and build.

Remaining launch checks: real multi-account sign-in, mobile browser walkthrough, real business details/project photographs, audience configuration and a tested database/file backup and restore procedure. Do not describe the system as fully production-verified before those checks pass.

## Product boundaries

Payments record amounts; the app does not collect money. Statements show cumulative received/paid amounts for an instalment. Agreements record custom terms and require separate signatures. Tax defaults to 0%; quotations are estimates, not GST tax invoices. No automatic WhatsApp messages, e-signatures, offline sync or multi-photo public gallery is included.

## Reference images and research

See RESEARCH.md for India-focused desk research. Stock photographs used as labelled illustrative covers:
- https://images.unsplash.com/photo-1600596542815-ffad4c1539a9
- https://images.unsplash.com/photo-1600607687920-4e2a09cf159d
- https://images.unsplash.com/photo-1460317442991-0ec209397118

### Release verification — 19 October 2026

Additional automated checks cover quotation/agreement/labour creation, record edits and deletion audit snapshots, cross-project edit rejection, PDF byte round-trip, denied client uploads/deletes, immediate membership revocation, cover unpublishing and Indian mobile-number normalization/deduplication. Identity and object storage remain mocked in these tests.

Printed quotation lines now use the same decimal rounding as totals. Payment documents explicitly say “Instalment statement” and label the due date; they are not individual transaction receipts. A successful save/upload followed by a failed list refresh is reported as saved, avoiding misleading retry prompts. Record edits preserve their original project. Forms cannot be dismissed while saving.

Production database schema and recent Worker error logs were inspected read-only. Expected tables exist and the returned error log list was empty; this is not proof of complete live workflow coverage. Browser QA is unavailable in the current managed environment. Real-user mobile/sign-in tests, audience setup, actual business content and operational database/R2 restore verification remain release blockers.
