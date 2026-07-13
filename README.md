# 叩鸣·工坊

> AI Agent 编排工坊——你定义意图，多个 AI Agent 协作完成知识工作。同时追问："这个意图值得吗？"

## 这是什么

叩鸣·工坊是一个多 Agent 协作工具。你输入一个意图（"分析新能源汽车市场"），四个 AI Agent 接力处理：

```
Planner → Researcher → Creator → Reviewer
 拆解意图    信息调研    生成内容    质量审查
```

每个 Agent 的输出经过**三条宪法**过滤：尊严（AI 必须声明身份）、自主（必须提供替代方案）、追问（必须声明假设）。

**不是**代码助手（Codex / Cursor）、**不是**开发者框架（CrewAI / AutoGen）、**不是**聊天机器人（ChatGPT）。是一个带哲学价值约束的知识工作台。

## 为什么存在

所有 AI 工具优化的是"AI 替你做更多"。叩鸣优化的是**"你做你自己的同时，AI 帮你更多"**。

三条宪法来自康德、马尔库塞、海德格尔和陈嘉映——不是噱头，是编码进规则引擎的硬约束。守护进程后台持续监控，审计面板跟踪你的能力保留度——防止你被自己的 AI 工具"优化"掉。

## 五分钟跑起来

```bash
git clone https://github.com/zhizhi-lab/kouming.git
cd kouming
npm install
npm run dev
```

打开 http://localhost:5173 → 输入意图 → 配 DeepSeek API Key（设置页面）→ 点"开始"。

**你需要自己的 DeepSeek API Key。** 叩鸣不碰你的 AI 数据——所有 AI 调用从你的浏览器直接连 DeepSeek。

## 架构

```
src/
├── constitution/     # 规则引擎 + 三条宪法 + Shell 权限策略
├── guardian/         # 后台守护进程（五项监控）
├── agents/           # Agent 注册表 + Planner/Creator/Researcher/Reviewer
├── orchestrator/     # 4-Agent 编排引擎
├── context/          # Token 预算控制的 Context Builder
├── knowledge/        # 本地知识库（IndexedDB）
├── audit/            # 代偿审计收集器 + 减速点 + 周期性报告
├── store/            # Zustand 状态管理（user/intent/agent/skills）
├── pages/            # 6 个页面（工坊/装配线/反思/技能/审计/设置）
└── components/       # Layout（竖侧边栏 + 两栏工作台）
```

测试：65 个用例，全通过。覆盖 constitution、guardian、agents、context、orchestrator、audit。

## 技能系统

叩鸣支持 Codex 格式的 SKILL.md——从 `openai/skills` 仓库、LobeHub、agentskills.io 导入都能直接解析。内置 8 个免费技能，更多的通过"导入"按钮自行安装。

## 技术栈

React 19 · Vite 8 · Zustand 5 · Vercel AI SDK · DeepSeek · Tailwind CSS · Vitest

## 许可

MIT License · Copyright 2026 知至实验室 (zhizhi.ink)

---

*叩鸣：叩问以鸣之——追问然后让答案发出声音。*
