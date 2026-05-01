# Claude Code — Configuration Guide

> A visual reference for configuring Claude Code using the **Agent Development Kit (ADK)** five-layer stack.

**Live site → [dantonoli.github.io/claude-code-config-guide](https://dantonoli.github.io/claude-code-config-guide)**

---

## What is this?

A complete, copy-paste-ready guide for setting up Claude Code as a production-grade agent. Covers every layer of the ADK stack with real examples, shell scripts, and config files.

| Layer | Name | Role |
|-------|------|------|
| L1 | CLAUDE.md | Memory — always loaded, always active |
| L2 | Skills | Knowledge — on-demand, description-matched modules |
| L3 | Hooks | Guardrails — deterministic shell scripts on agent events |
| L4 | Subagents | Delegation — isolated Claude instances with own context |
| L5 | Plugins | Distribution — bundle and ship the full stack to your team |
| + | MCP Server | External tools — GitHub, databases, Slack, custom APIs |

---

## Quick start

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Init a new project
mkdir my-agent && cd my-agent
claude init

# Create your CLAUDE.md files
mkdir -p ~/.claude && touch ~/.claude/CLAUDE.md   # global
mkdir -p .claude  && touch .claude/CLAUDE.md      # project

# Add your first skill
mkdir -p .claude/skills/my-skill
touch .claude/skills/my-skill/SKILL.md

# Add guardrail hooks
mkdir -p hooks
touch hooks/PreToolUse.sh hooks/PostToolUse.sh
chmod +x hooks/*.sh

# Register hooks
cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse":  "hooks/PreToolUse.sh",
    "PostToolUse": "hooks/PostToolUse.sh"
  }
}
EOF

claude
```

---

## Download the full guide

**[⬇ GUIDE.md](./GUIDE.md)** — single Markdown file with all five layers, every code example, and copy-paste templates. Drop it anywhere as a reference.

---

## Repo structure

```
claude-code-config-guide/
├── index.html        ← Overview + interactive layer diagram
├── l1.html           ← L1 · CLAUDE.md
├── l2.html           ← L2 · Skills
├── l3.html           ← L3 · Hooks
├── l4.html           ← L4 · Subagents
├── l5.html           ← L5 · Plugins
├── mcp.html          ← MCP Server
├── style.css         ← shared styles
├── nav.js            ← active tab detection + copy buttons
├── GUIDE.md          ← downloadable full reference
└── README.md         ← this file
```

---

## Contributing

Found something wrong or missing? Open an issue or PR — corrections to hook exit codes, new subagent patterns, updated MCP server configs all welcome.

---

*Based on the Agent Development Kit (ADK) · [docs.claude.ai](https://docs.claude.ai)*
