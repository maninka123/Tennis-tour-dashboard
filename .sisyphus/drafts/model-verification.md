# Draft: Model Verification

## Configured Models (from user snippet)
- `google/antigravity-claude-opus-4-6-thinking`
- `openai/gpt-5.2`
- `github-copilot/claude-sonnet-4.5`
- `google/gemini-3-pro`
- `openai/gpt-5.3-codex`
- `claude-haiku-4.5`

## Verification Needs
1. **`google/antigravity...`**:
   - Suspicious format. Claude is Anthropic. "Antigravity" is the system name.
   - likely `anthropic/claude-3-opus` or similar, maybe proxied via Google Vertex?
2. **`google/gemini-3-pro`**:
   - In 2026, Gemini 3 is likely released.
   - Verify specific ID string (e.g. `models/gemini-3-pro` vs `google/gemini-3-pro`).
3. **`github-copilot/...`**:
   - Copilot usually proxies models. ID format checks out for a proxy.

## Action
- Reading config file to confirm exact strings.
- Checking for any schema or validation logic in the repo.
