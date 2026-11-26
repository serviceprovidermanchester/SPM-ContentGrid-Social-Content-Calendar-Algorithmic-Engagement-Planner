# Contributing to ContentGrid

Thank you for your interest in contributing to **ContentGrid**, an open-source project created and maintained by **SPManchester Private Limited** under the leadership of **Sayed Mudassar Akbar**.

We welcome contributions from engineers, data analysts, and marketing strategists worldwide.

---

## Code of Conduct

All contributors must abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please keep discussions constructive, respectful, and collaborative.

---

## Getting Started

### Prerequisites

- **Node.js** >= `22.5.0` (required for native `node:sqlite`, `node:http`, and `node:crypto`)
- **Git**
- Optional: **Docker** & **Docker Compose**

### Local Setup

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/SPM-ContentGrid-Social-Content-Calendar-Algorithmic-Engagement-Planner.git
   cd SPM-ContentGrid-Social-Content-Calendar-Algorithmic-Engagement-Planner
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Verify code syntax:
   ```bash
   npm run check
   ```
5. Run the comprehensive test suite:
   ```bash
   npm test
   ```
6. Start the local development server:
   ```bash
   npm start
   ```
   Open `http://localhost:4000/` in your browser.

---

## Architectural Principles

When writing code for ContentGrid, adhere to our core architectural standards:

1. **Zero External Runtime Dependencies:** Keep the core engine lightweight and robust using Node.js standard libraries (`node:http`, `node:sqlite`, `node:crypto`).
2. **Deterministic Calculations:** Scoring and roll-up calculations in `backend/src/marketing/engine.js` must remain completely deterministic, reproducible, and verifiable.
3. **Multi-Tenant Brand Scoping:** Every query and data access must remain strictly isolated by `brand_id`.
4. **Vanilla Front-End Simplicity:** The web client in `web/` uses clean, standards-compliant HTML5, CSS3, and modern vanilla JavaScript without heavy bundler overhead.

---

## Development & Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` Adds a new user-facing capability or API endpoint
- `fix:` Fixes a bug or calculation anomaly
- `docs:` Documentation or README updates
- `test:` Adds or refactors unit/integration test cases
- `perf:` Performance optimizations
- `refactor:` Code improvements that do not alter behavior
- `chore:` Maintenance tasks, configs, and workflow updates

### Branch Naming

- `feature/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`

---

## Submitting Pull Requests

1. Create a descriptive branch from `main`.
2. Ensure all 62+ live automated tests pass (`npm test`).
3. If introducing a new feature or algorithm adjustment, include matching test assertions in `tests/run-tests.js`.
4. Submit a Pull Request targeting the `main` branch.
5. Fill out the Pull Request template completely.

---

## Questions & Enterprise Inquiries

For technical questions or commercial development inquiries, contact:
- **Company:** SPManchester Private Limited
- **Website:** [spmanchester.com](https://spmanchester.com/)
- **Email:** [info@spmanchester.com](mailto:info@spmanchester.com)
