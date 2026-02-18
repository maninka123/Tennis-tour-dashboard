# OpenCode Plugin Model Error Analysis

## Issue Summary
**Error:** `Agent atlas's configured model opencode/glm-4.7-free is not valid`

## Root Cause

The `opencode/glm-4.7-free` model was a **free tier model** that was **removed from OpenCode in January 2026**. However, the oh-my-opencode plugin (v3.5.5) still has this model hardcoded as the `ULTIMATE_FALLBACK` in its compiled code.

### Where the error originates:

**File:** `/Users/pasinduranasinghe/.npm-global/lib/node_modules/oh-my-opencode/dist/cli/index.js` (line 7528)

```javascript
var ULTIMATE_FALLBACK = "opencode/glm-4.7-free"
```

This fallback is used when:
1. No model providers are configured
2. The configured model provider is invalid/unavailable
3. The UI-selected model cannot be resolved

## Evidence from Research

### GitHub Issues confirming removal:
- **Issue #10176**: "I canot using the free models anymore? 2026.1.13, my free modela are gone, like minimax2.1, glm4.7"
- **Issue #10177**: "Why have the minimax and GLM models disappeared in the latest version?"
- **Issue #10242**: "The default models are no longer displayed" (minimax-2.1 and glm4.7 no longer appeared)
- **Reddit**: "GLM 4.7 was free on OpenCode for a limited time so they can test the model"

### Timeline:
- **Before Jan 2026**: GLM 4.7 and MiniMax were available as free models
- **Jan 13, 2026**: Free models removed from OpenCode
- **Current**: `opencode/glm-4.7-free` returns "not valid" error

## Current Configuration Status

### Your Current Agent Configs (`~/.config/opencode/oh-my-opencode.json`):
```json
{
  "atlas": { "model": "github-copilot/claude-sonnet-4.5" },
  "hephaestus": { "model": "google/antigravity-claude-opus-4-5-thinking" },
  "prometheus": { "model": "github-copilot/claude-opus-4.6" }
}
```

These configs are **correct** and use valid models. The error occurs because the **fallback mechanism** is being triggered.

## Why the Error Happens When Pressing Tab

When you press Tab to change models, the plugin:
1. Attempts to validate the current/selected model
2. If validation fails or no model is selected, it falls back to `ULTIMATE_FALLBACK`
3. The fallback model `opencode/glm-4.7-free` no longer exists
4. Error is displayed: "Agent X's configured model opencode/glm-4.7-free is not valid"

## Solutions

### Solution 1: Ensure Valid Model Provider is Configured (Recommended)

Your `~/.config/opencode/opencode.json` already has Google provider configured with valid models. The issue might be that the plugin isn't detecting this properly.

**Verify your provider config:**
```json
{
  "provider": {
    "google": {
      "name": "Google",
      "models": {
        "antigravity-gemini-3-pro": { ... },
        "antigravity-gemini-3-flash": { ... },
        "antigravity-claude-sonnet-4-5": { ... }
      }
    }
  }
}
```

### Solution 2: Update oh-my-opencode Plugin

Check if there's a newer version that fixes the fallback model:

```bash
npm update -g oh-my-opencode
```

Or reinstall:
```bash
npm uninstall -g oh-my-opencode
npm install -g oh-my-opencode@latest
```

### Solution 3: Report Issue to oh-my-opencode Repository

This is a **bug in the oh-my-opencode plugin** - it has a hardcoded fallback to a model that no longer exists.

**Report at:** https://github.com/code-yeongyu/oh-my-opencode/issues

**Include:**
- Error message: "Agent atlas's configured model opencode/glm-4.7-free is not valid"
- Plugin version: 3.5.5
- Context: GLM-4.7-free was removed from OpenCode in January 2026
- Suggested fix: Update ULTIMATE_FALLBACK to a currently available model

### Solution 4: Temporary Workaround (Manual Patch)

If you need an immediate fix and are comfortable editing compiled code:

```bash
# Backup the file
cp /Users/pasinduranasinghe/.npm-global/lib/node_modules/oh-my-opencode/dist/cli/index.js \
   /Users/pasinduranasinghe/.npm-global/lib/node_modules/oh-my-opencode/dist/cli/index.js.bak

# Replace the fallback model (use a valid model like google/gemini-3-flash)
sed -i '' 's/opencode\/glm-4.7-free/google\/gemini-3-flash/g' \
   /Users/pasinduranasinghe/.npm-global/lib/node_modules/oh-my-opencode/dist/cli/index.js
```

**Valid fallback alternatives:**
- `google/gemini-3-flash` (free tier)
- `google/gemini-3-pro`
- `github-copilot/claude-sonnet-4.5`

## Summary

The error is **not your fault** - it's a bug in the oh-my-opencode plugin that has a hardcoded fallback to a model (`opencode/glm-4.7-free`) that OpenCode removed in January 2026. The plugin needs to be updated to use a currently available model as the fallback.

**Immediate action:** Report the issue to https://github.com/code-yeongyu/oh-my-opencode/issues

**Workaround:** Ensure you have a valid model selected before pressing Tab, or patch the fallback model in the compiled code.
