# Contributing to PraesagiumChain

Thank you for your interest in contributing. Please read this document before submitting changes.

## Code of Conduct

Be respectful and collaborative. We aim to maintain a welcoming environment for all contributors.

## Intellectual Property

- **PraesagiumChain** and the **PHPE (Praesagium Hybrid Predictive Engine)** contain proprietary algorithms and techniques.
- By contributing, you agree that your contributions will be licensed under the project's license (see [LICENSE](LICENSE)).
- Do not include code, algorithms, or logic from other projects without proper attribution and license compatibility.
- If you have questions about IP or licensing, open an issue before contributing.

## How to Contribute

### Before You Start

1. Open an issue to discuss significant changes or new features.
2. Check existing issues and PRs to avoid duplicates.
3. Ensure your changes align with the project's architecture (see [docs/architecture.md](docs/architecture.md)).

### Development Setup

1. Clone the repository and run `npm install` and `cd backend-rust && cargo build`.
2. Copy `config/env.example` to `.env` and fill required values.
3. See [docs/setup.md](docs/setup.md) for the full setup guide.

### Pull Request Process

1. Create a branch from `main` (e.g. `feature/your-feature` or `fix/your-fix`).
2. Keep changes focused and reasonably scoped.
3. Run tests: `npm test` and `npm run test:backend`.
4. Ensure the code compiles and passes linting (`cd frontend && npm run lint` after a full `npm install` in `frontend/`; `cd backend-rust && cargo clippy -- -D warnings`). Prefer small, focused PRs for removing unused code or tightening imports.
5. Never commit `.env` or secrets; use `config/env.example` as reference.
6. Update documentation if you change behavior or add features.

### Security

- Do not introduce known vulnerabilities. For smart contracts, follow Checks-Effects-Interactions and use Slither/cargo-audit.
- If you discover a security issue, please report it privately (do not open a public issue).
- CI and operations expectations: [docs/operations.md](docs/operations.md).

### Cursor: rules, skills, and agents

- **Workspace rules** (`.cursorrules`) define architecture and quality bars; large or risky changes should have an [ADR](docs/adr/) when they introduce new patterns or dependencies.
- **Skills** in Cursor are optional checklists—use them for the area you touch (e.g. Postgres when editing `backend-rust/migrations_pg/`, React/Next for `frontend/`), not as a reason to add scope.
- **Subagents / Task tool:** useful for exploring unfamiliar parts of the repo or fixing CI; human review remains required for architecture and security decisions.

### Repository layout

Top-level folders are summarized in [docs/architecture.md](docs/architecture.md#repository-layout). Strategy documents: [`StartUp/`](StartUp/).

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
