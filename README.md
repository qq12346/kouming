# Kouming — AI Agent Orchestration Workshop

[中文版](./README_CN.md)

> You define the intent. Four AI agents collaborate on knowledge work. One question runs under everything: "Is this intent worth it?"

## What is this?

Kouming is a multi-Agent collaboration tool. You input one intent (e.g., "Analyze the new energy vehicle market"), and four AI agents work in sequence:

```
Planner → Researcher → Creator → Reviewer
 Decompose    Investigate    Generate    Review
```

Every agent output passes through three constitutional rules: Dignity (AI must declare its identity), Autonomy (must provide alternatives), Inquiry (must state assumptions).

It is **not** a coding assistant (Codex / Cursor), **not** a developer framework (CrewAI / AutoGen), **not** a chatbot (ChatGPT). It is a knowledge workbench with embedded philosophical value constraints.

## Why this exists

Most AI tools optimize for "AI does more for you." Kouming optimizes for **"you remain yourself, while AI helps you more."**

The three constitutional rules draw from Kant, Marcuse, Heidegger, and Chen Jiaying — not as decoration, but as hard constraints encoded into a rules engine. A background daemon monitors continuously. An audit panel tracks your capacity retention — preventing you from being "optimized" out of your own tool.

## Run in 5 minutes

```bash
git clone https://github.com/qq12346/kouming.git
cd kouming
npm install
npm run dev
```

Open http://localhost:5173 → enter an intent → configure your DeepSeek API Key (Settings page) → press Start.

**You need your own DeepSeek API Key.** Kouming never touches your AI data — all API calls go directly from your browser to the AI provider.

## Architecture

```
src/
├── constitution/     # Rules engine + 3 constitutional rules + shell policy
├── guardian/         # Background daemon (5 monitors)
├── agents/           # Agent registry + Planner/Creator/Researcher/Reviewer
├── orchestrator/     # 4-Agent orchestration engine
├── context/          # Token-budget-controlled Context Builder
├── knowledge/        # Local knowledge base (IndexedDB)
├── audit/            # Compensatory audit collector + slowdown points + periodic reports
├── store/            # Zustand state management (user/intent/agent/skills)
├── pages/            # 6 pages (Dashboard / Assembly Line / Reflection / Skills / Audit / Settings)
└── components/       # Layout (vertical sidebar + two-column workspace)
```

Tests: 65 cases, all passing. Covering constitution, guardian, agents, context, orchestrator, audit.

## Skill System

Kouming supports Codex-format SKILL.md files. Import directly from the `openai/skills` repository, LobeHub, agentskills.io, or your local files. 8 free skills built in. Import more via the "Import" button.

## Tech Stack

React 19 · Vite 8 · Zustand 5 · Vercel AI SDK · BYOK · Tailwind CSS · Vitest

## License

Apache License 2.0 · Copyright 2026 叩鸣实验室 (zhizhi.ink)

---

*Kouming: to strike and let it ring — to question until the answer makes a sound.*
