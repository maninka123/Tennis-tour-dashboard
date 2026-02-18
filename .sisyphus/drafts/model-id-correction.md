# Draft: Model ID Correction

## User's Concern
User suspects `google/gemini-3-pro` is an incorrect ID format for `oh-my-opencode`.

## Hypothesis
The format `provider/model-name` is standard, but the *specific model name* might be different.
Possibilities:
- `google/gemini-pro-1.5` (Current standard)
- `google/gemini-1.5-pro`
- `google_vertex/gemini-1.5-pro`
- `gemini-1.5-pro-latest`
- `google/gemini-3.0-pro-001` (Versioning style)

## Investigation
- Searching local files for "gemini" usage.
- Searching online for `oh-my-opencode` specific model lists.

## Goal
Provide the **exact string** to copy-paste.
