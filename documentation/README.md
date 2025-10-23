# Documentation Index

- Architecture: see `documentation/architecture/README.md` for the full set of focused guides.
- Developer Guide: `documentation/developer-guide.md` — practical rules, module checklist, runtime choice, and local workflow.
- AI Agent Instructions: `documentation/instructions/for-ai-agents.md` — conventions and PR checklist for automated changes.

Highlights

- Server-first UI state: `documentation/architecture/23-ui-state-management.md`.
- Routing and Request builder: `documentation/architecture/03-routing-controllers.md`.
- DI & Services Registry: `documentation/architecture/11-di-services-registry.md`.
- Data/Migrations: `documentation/architecture/17-data-migrations.md`.

Seeding and Scaffolding

- Seeding: See `README.md` and `documentation/developer-guide.md` for commands (`pnpm db:seed`, `--preview`, `--only`, `--tags`, `db:reset`) and seeder shape `{ name, order?, tags?, run }`.
- Scaffolder: Run `pnpm module:generate` for an interactive module generator (service/http/schema/seed/events/jobs) with optional runtime wiring.
