# Draft: Sisyphus models and terms

## Requirements (confirmed)
- User wants to know how to change the models used in tasks (both repo config and platform-level settings).
- User asked what Sisyphus/Hephaestus/Prometheus mean.
- User asked for the difference between Sisyphus and Hephaestus.
- User suggests Hephaestus can run multiple Sisyphus.
- User asks if Sisyphus coordinates with Hephaestus and divides work among agents before executing.
- User thinks specialist agents are inside Hephaestus and it divides work to them.
- User wants detailed explanation of where to use Prometheus/Sisyphus/Hephaestus profiles.
- User asks which models are configured in the three setups (Prometheus/Sisyphus/Hephaestus).
- User shows UI label implying Prometheus is GPT-5.2 Codex OpenAI medium.
- User asks what Atlas is.
- User wants to switch Opus models from GitHub Copilot to Google “antigravity” provider.
- User wants Sisyphus and Hephaestus set to Opus with variant max.

## Technical Decisions
- None yet.

## Research Findings
- Repo scan found no OpenCode/agent/model settings in this project.
- External docs indicate model settings live in OpenCode config (project: `.opencode/oh-my-opencode.json`, user: `~/.config/opencode/oh-my-opencode.json` or `%APPDATA%\opencode\oh-my-opencode.json`).
- `opencode models` lists Google antigravity models including:
  - `google/antigravity-claude-opus-4-5-thinking`
  - `google/antigravity-claude-sonnet-4-5`
  - `google/antigravity-claude-sonnet-4-5-thinking`

## Open Questions
- Where should model changes apply: default model for all tasks, per-agent overrides, or per-task overrides?
- Any preferred model(s) or provider(s)?
- Clarify if user wants confirmation of Hephaestus vs Sisyphus orchestration model.
- Whether to provide concrete routing/model config in this repo or platform-wide only.
- Which environment/UI are they viewing these three sections in (so we can locate exact model config)?
- Exact provider/model ID for Google “antigravity” (e.g., provider slug + model name).
- Confirm Opus model ID to use (`google/antigravity-claude-opus-4-5-thinking` or other).

## Scope Boundaries
- INCLUDE: Guidance for repo config and platform-level settings; explanations of agent names/roles.
- EXCLUDE: Actual implementation changes (planning only).
