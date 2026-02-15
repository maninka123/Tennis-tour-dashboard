# Contributing

Thanks for contributing to Tennis Live Dashboard.

## Local Setup

1. Clone the repository.
2. Start quickly:
   - `./start.sh`
3. Or run manually:
   - `cd backend`
   - `python3 -m venv venv`
   - `source venv/bin/activate` (Windows: `venv\Scripts\activate`)
   - `pip install -r requirements.txt`
   - `python app.py`
   - In another terminal: `cd frontend && python3 no_cache_server.py`

## Branch Naming

Use short, clear names:

- `feature/<topic>`
- `fix/<topic>`
- `docs/<topic>`
- `chore/<topic>`

Examples:

- `feature/notification-launcher`
- `fix/bracket-champion-header`
- `docs/readme-api-table`

## Commit Guidelines

- Use concise, imperative commit messages.
- Preferred prefixes:
  - `feat:`
  - `fix:`
  - `docs:`
  - `chore:`
  - `refactor:`

Example:

- `fix: restore champion summary in bracket header`

## Pull Request Checklist

Before opening a PR:

- [ ] Code runs locally.
- [ ] No unrelated files were changed.
- [ ] README/docs updated if behavior changed.
- [ ] API/UI changes are described clearly.
- [ ] Screenshots included for visible UI changes.
- [ ] Startup scripts still work (`start.sh` / `start_local.sh`).

## Coding Style

- Keep changes focused and minimal.
- Preserve existing project structure and naming.
- Prefer readable code over clever code.
- Avoid destructive git commands in shared branches.
- For frontend, keep styles consistent with existing UI language.

## Reporting Bugs

Please include:

- Steps to reproduce
- Expected vs actual behavior
- Logs/error message
- Environment (OS, Python version, browser)

