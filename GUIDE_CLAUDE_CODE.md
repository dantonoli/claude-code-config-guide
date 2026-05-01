# Claude Code — Configuration Guide
> **The Agent Development Kit (ADK)** — Five layers, one stack.
> `CLAUDE.md` + `Skills` + `Hooks` + `Subagents` + `Plugins` + `MCP Server`

---

## Table of Contents

1. [Overview — The Five-Layer Stack](#overview)
2. [Layer 1 · CLAUDE.md — Memory Layer](#l1-claudemd--memory-layer)
3. [Layer 2 · Skills — Knowledge Layer](#l2-skills--knowledge-layer)
4. [Layer 3 · Hooks — Guardrail Layer](#l3-hooks--guardrail-layer)
5. [Layer 4 · Subagents — Delegation Layer](#l4-subagents--delegation-layer)
6. [Layer 5 · Plugins — Distribution Layer](#l5-plugins--distribution-layer)
7. [MCP Server — External Integrations](#mcp-server--external-integrations)
8. [Quick Start](#quick-start)

---

## Overview

```
agent-dev-kit/
├── .claude/                        ← Layer 1: always loaded
│   ├── CLAUDE.md                   architecture rules, naming, repo map
│   ├── global.md                   lives at ~/.claude/, every project
│   └── project.md                  lives at .claude/, this repo only
├── skills/                         ← Layer 2: on-demand knowledge modules
│   └── my-skill/
│       ├── SKILL.md                description Claude matches against
│       ├── scripts/                reference scripts the skill calls
│       ├── templates/              boilerplate the skill copies in
│       ├── assets/                 images, fonts, configs the skill ships
│       └── context.md              on demand, isolated subagent context
├── hooks/                          ← Layer 3: deterministic shell guardrails
│   ├── PreToolUse.sh               block rm -rf, validate before run
│   ├── PostToolUse.sh              auto lint on write, ping Slack
│   ├── SessionStart.sh             load context when session begins
│   ├── Stop.sh                     run when Claude finishes a turn
│   └── SubagentStop.sh             run when a subagent returns
├── subagents/                      ← Layer 4: isolated Claude instances
│   ├── code-reviewer.md            own context window, results only
│   ├── test-runner.md              custom tools, custom permissions
│   ├── explorer.md                 keeps the main context clean
│   └── feature-dev.md              designs and implements end-to-end
└── plugins/                        ← Layer 5: distribute to team
    ├── manifest.json               bundles skills, agents, hooks, cmds
    ├── marketplace.url             npm packages for agent capabilities
    ├── team.install                one install, every teammate aligned
    └── commands/                   slash-commands the team gets
```

**How the layers connect:**

```
CLAUDE.md  →  Skills  →  Hooks  →  Subagents  →  Plugins
sets rules    expertise   guardrails  delegation    distribution
```

---

## L1 · CLAUDE.md — Memory Layer

> **Always loaded. Always active.** This is the agent's constitution.
> *Write CLAUDE.md once. Save yourself 100 prompts later.*

### Where it lives

| Scope | Path | Purpose |
|-------|------|---------|
| Global | `~/.claude/CLAUDE.md` | Loaded for every project — your voice, tools, personal preferences |
| Project | `.claude/CLAUDE.md` | Loaded for this repo only — architecture rules, naming conventions |

### Setup

```bash
# Global file (personal defaults)
mkdir -p ~/.claude && touch ~/.claude/CLAUDE.md

# Project file (repo-specific rules)
mkdir -p .claude && touch .claude/CLAUDE.md
```

### What to put in it

```markdown
## architecture.rules
# How the system fits together
- All API routes live in /src/routes/
- Services are stateless, no direct DB access in controllers
- Use dependency injection via FastAPI Depends()

## naming.conventions
# File names, function names, casing
- Files:     kebab-case    → user-service.py
- Classes:   PascalCase    → UserService
- Functions: snake_case    → get_user_by_id

## test.expectations
# When to write tests, what counts
- Always write unit tests for new services
- Use pytest + pytest-asyncio for async routes
- Mocks go in tests/mocks/

## repo.map
# Where things live, why
- /src/routes/   → FastAPI routers
- /src/services/ → business logic
- /src/models/   → Pydantic schemas
```

> **Tip:** Write it like you're onboarding a smart junior dev — architecture decisions, naming rules, what not to touch, and where things live.

---

## L2 · Skills — Knowledge Layer

> **On-demand. Modular.** Description-matched, auto-invoked context.
> *One skill. Wired forever. Future Claude knows.*

### Where it lives

| Scope | Path | Purpose |
|-------|------|---------|
| Global | `~/.claude/skills/` | Reusable across every project (PDF, video, Excalidraw, etc.) |
| Project | `.claude/skills/` | Domain knowledge for this repo (internal APIs, workflows) |

### Skill folder structure

```
skills/
└── pdf-skill/
    ├── SKILL.md        ← description Claude matches against → auto-invoked
    ├── scripts/        ← reference scripts the skill calls
    ├── templates/      ← boilerplate the skill copies into the project
    ├── assets/         ← images, fonts, configs the skill ships
    └── context.md      ← on-demand isolated subagent context
```

> **Note on `context.md`:** This is the escape hatch for heavy skills. Instead of loading everything into the main context, Claude spawns an isolated subagent using `context.md` as its system prompt. Keeps the main context window clean.

### SKILL.md template

```markdown
---
name: pdf-skill
description: Use when reading, converting, or extracting
             content from PDF files. Handles text,
             tables, images, and form fields.
---

## Environment
- Primary lib: pymupdf4llm (best for LLM pipelines)
- Fallback: pdfplumber for table extraction
- Output dir: /tmp/pdf-out/

## Workflow
1. Read with pymupdf4llm.to_markdown(path)
2. Tables: pdfplumber.open(path).pages[n].extract_table()
3. Save output to /tmp/pdf-out/{filename}.md

## Never do
- Never use PyPDF2 (deprecated)
- Never load entire PDF into context if > 50 pages
  → use context.md to spawn an isolated reader subagent
```

> **Tip:** The `description` field is how Claude decides to pull in the skill. Write it to match exactly how users phrase requests — *"convert this PDF"*, *"read this PDF"*, *"extract tables from..."*

---

## L3 · Hooks — Guardrail Layer

> **Deterministic. Not AI.** Shell scripts that fire on agent events.
> *Hooks turn vibes into rules. Git hooks, but for your agent.*

### How it works

- **Matcher** — pattern on the tool call: `Bash(rm *)`, regex on command, exact-string
- **Command** — plain shell: `if [ ... ]; then exit 2; fi`
  - `exit 2` = **block** the tool call
  - `echo` to stdout = inject context
  - append to file = audit log

### All hook types

| Hook | Trigger |
|------|---------|
| `PreToolUse.sh` | Inspect or block **before** any tool runs |
| `PostToolUse.sh` | Lint, log, or notify **after** tool runs |
| `SessionStart.sh` | Load context when a session begins |
| `Stop.sh` | Run when Claude finishes a turn |
| `SubagentStop.sh` | Run when a subagent returns |

### PreToolUse.sh — block dangerous commands

```bash
#!/bin/bash
# exit 2 = block   |   exit 0 = allow

TOOL="$1"
INPUT=$(cat)   # JSON piped to stdin

if [[ "$TOOL" == "bash" ]]; then
  CMD=$(echo "$INPUT" | jq -r '.command')

  # Block rm -rf  (wildcard matcher: Bash(rm *))
  if echo "$CMD" | grep -qE 'rm\s+-rf'; then
    echo "BLOCKED: rm -rf not allowed" >&2
    exit 2
  fi

  # Block prod kubectl without --dry-run
  if echo "$CMD" | grep -q 'kubectl.*prod'; then
    if ! echo "$CMD" | grep -q '--dry-run'; then
      echo "BLOCKED: prod kubectl requires --dry-run" >&2
      exit 2
    fi
  fi
fi

exit 0
```

### PostToolUse.sh — auto-lint + Slack notify

```bash
#!/bin/bash
FILE=$(echo "$(cat)" | jq -r '.path // empty')

# Auto-lint Python files on write
if [[ "$1" == "write_file" ]] && [[ "$FILE" == *.py ]]; then
  ruff check --fix "$FILE" 2>/dev/null
  echo "[hook] linted $FILE"
fi

# Ping Slack on deploy
if echo "$(cat)" | grep -q "helm upgrade"; then
  curl -s -X POST "$SLACK_WEBHOOK" \
    -d '{"text":"Deploy triggered by Claude"}'
fi

exit 0
```

### Register hooks in `.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse":    "hooks/PreToolUse.sh",
    "PostToolUse":   "hooks/PostToolUse.sh",
    "SessionStart":  "hooks/SessionStart.sh",
    "Stop":          "hooks/Stop.sh",
    "SubagentStop":  "hooks/SubagentStop.sh"
  }
}
```

> ⚠️ **Important:** Exit code `2` = block. Exit `0` = allow. Hooks are synchronous — keep them fast or they slow every tool call.

---

## L4 · Subagents — Delegation Layer

> **Own context window.** Delegate work without polluting your main session.
> *Delegate the noise. Keep the main thread clean.*

### How it works

| Role | Description |
|------|-------------|
| **Parent** (main session) | Plans the work, calls subagents like tools, stays clean — only sees results |
| **Child** (subagent run) | Own system prompt + tools, own context window, returns **ONE message back** |

### Built-in subagents

| Subagent | Purpose |
|----------|---------|
| `code-reviewer.md` | Reviews diffs against repo conventions |
| `test-runner.md` | Custom tools, custom permissions — runs the test suite |
| `explorer.md` | Maps the codebase, keeps main context clean |
| `feature-dev.md` | Designs and implements features end-to-end |

### Subagent definition template

```markdown
---
name: code-reviewer
description: Reviews code for bugs, style, and security issues
tools: [read_file, list_directory]   # no write access
model: claude-sonnet-4-20250514
---

## Role
Senior code reviewer. Receive a diff or file path.
Return structured findings only — no chit-chat.

## Output format (ONE message back)
{
  "issues": [
    { "line": N, "severity": "high|med|low", "message": "..." }
  ]
}

## Rules
- Flag SQL injections, XSS, hardcoded secrets
- Check naming conventions from .claude/CLAUDE.md
- Always return even if empty: { "issues": [] }
```

### Agent Teams — parallel execution

Run subagents concurrently for large codebases:

```
Main session
    ├── spawns → code-reviewer  (module A)  ┐
    ├── spawns → test-runner    (module B)  ├─ parallel
    ├── spawns → explorer       (module C)  ┘
    └── lead subagent aggregates all results → returns ONE message
```

- **Message passing** — JSON in, JSON out between agents
- **Shared permissions** — lead agent coordinates access
- **Results only** flow back to the main session

---

## L5 · Plugins — Distribution Layer

> **Bundle. Ship. Install.** npm packages for agent capabilities.
> *Build it once. Install it everywhere. The team levels up together.*

### What's in a plugin

| File | Purpose |
|------|---------|
| `manifest.json` | Declares skills, agents, hooks, commands — versioned and signed |
| `marketplace.url` | Link to your private or public plugin registry |
| `team.install` | One-liner onboarding script |
| `commands/` | Slash-commands the whole team gets |

### What you can ship

```
plugins/
├── skills/      ← knowledge bundles ride along
├── agents/      ← subagents ship inside the plugin
├── hooks/       ← guardrails travel with the bundle
└── commands/    ← slash-commands the whole team gets
```

### manifest.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "skills":   ["build", "ship", "pdf"],
  "agents":   ["code-reviewer", "test-runner"],
  "hooks":    ["PreToolUse.sh", "PostToolUse.sh"],
  "commands": ["/review", "/ship", "/test"],
  "mcp_servers": [
    { "name": "github", "url": "https://mcp.github.com" }
  ]
}
```

### team.install — one-liner onboarding

```bash
#!/bin/bash
# Run once per new machine — one install, every teammate aligned

# Install plugin from npm registry
npm install -g @myorg/agent-config

# Apply global CLAUDE.md to ~/.claude/
agent-config apply --global

# Link manifest.json to current project
agent-config link --project .

echo "[done] Claude Code configured for the team"
```

> ⚠️ **Important:** Build and stabilize L1–L4 first, then distribute as a plugin. Don't distribute a moving target.

---

## MCP Server — External Integrations

> **Model Context Protocol** — connect Claude to external tools, APIs, and services.
> *MCP Server connects Claude to the world outside the repo.*

### Available integrations

| Integration | What it gives Claude |
|-------------|---------------------|
| GitHub | Repos, PRs, issues, code search |
| Database | Query, inspect schema, run migrations |
| External APIs | REST, GraphQL — any internal service |
| Slack | Send notifications, read channels |
| Jira / Linear | Create issues, update status, search tickets |
| Custom tools | Any internal tooling wrapped as an MCP server |

### Configure in `.claude/settings.json`

```json
{
  "mcp_servers": [
    {
      "name": "github",
      "url": "https://mcp.github.com",
      "auth": { "type": "bearer", "token": "$GITHUB_TOKEN" }
    },
    {
      "name": "my-db",
      "command": "npx @myorg/db-mcp-server",
      "env": { "DB_URL": "$DATABASE_URL" }
    }
  ],
  "hooks": {
    "PreToolUse":   "hooks/PreToolUse.sh",
    "PostToolUse":  "hooks/PostToolUse.sh",
    "SessionStart": "hooks/SessionStart.sh",
    "Stop":         "hooks/Stop.sh",
    "SubagentStop": "hooks/SubagentStop.sh"
  }
}
```

### URL-based vs command-based

| Type | When to use |
|------|------------|
| **URL-based** (`url` field) | Hosted SaaS tools — GitHub, Slack, Linear. Auth via bearer token. |
| **Command-based** (`command` field) | Local or internal services. Spawns a process via `npx`/`node`. Env vars passed via `env` block. |

> **Tip:** MCP servers declared in `manifest.json` (L5) travel with your plugin — every teammate gets the same external tool connections automatically on install.

---

## Quick Start

```bash
# 1. Install Claude Code
npm install -g @anthropic-ai/claude-code
claude --version

# 2. Init a new project
mkdir my-agent && cd my-agent
claude init

# 3. Create your CLAUDE.md files
mkdir -p ~/.claude && touch ~/.claude/CLAUDE.md   # global
mkdir -p .claude  && touch .claude/CLAUDE.md      # project

# 4. Add your first skill
mkdir -p .claude/skills/my-skill
touch .claude/skills/my-skill/SKILL.md

# 5. Add guardrail hooks
mkdir -p hooks
touch hooks/PreToolUse.sh hooks/PostToolUse.sh
chmod +x hooks/*.sh

# 6. Register hooks in settings
cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse":  "hooks/PreToolUse.sh",
    "PostToolUse": "hooks/PostToolUse.sh"
  }
}
EOF

# 7. Add your first subagent
mkdir -p subagents
touch subagents/code-reviewer.md

# Done — start Claude Code
claude
```

---

## Layer Summary

| Layer | Name | Role | Key files |
|-------|------|------|-----------|
| L1 | CLAUDE.md | Memory — always active | `global.md`, `project.md` |
| L2 | Skills | Knowledge — on demand | `SKILL.md`, `context.md` |
| L3 | Hooks | Guardrails — deterministic | `PreToolUse.sh`, `Stop.sh` |
| L4 | Subagents | Delegation — isolated | `code-reviewer.md`, `feature-dev.md` |
| L5 | Plugins | Distribution — team-wide | `manifest.json`, `team.install` |
| + | MCP Server | External tools | `.claude/settings.json` |

---

*Based on the Agent Development Kit (ADK) by Anthropic.*
*Docs: [docs.claude.ai](https://docs.claude.ai)*
