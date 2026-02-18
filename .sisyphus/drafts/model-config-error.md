# Draft: Model config error when changing model via tab

## Requirements (confirmed)
- User sees error: agent atlas/hephaestus/prometheus configured model `opencode/glm-4.7-free` is not valid
- Error occurs when changing model via tab
- User says they are running newest version

## Technical Decisions
- None yet

## Research Findings
- None yet

## Open Questions
- Where does the error surface (CLI output/logs/UI message)?
- Which config file or settings control agent models?
- Exact text of the error message and any stack trace
- Which UI/tool is used for model switching (terminal UI, editor, web UI)?
- Exact plugin platform and version (VS Code, JetBrains, Zed, Neovim, etc.)

## Scope Boundaries
- INCLUDE: Identify configuration source of invalid model and why tab change triggers it
- EXCLUDE: Implementing fixes until plan is confirmed
