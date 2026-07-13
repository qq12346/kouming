# 叩鸣·工坊 — 技术选型文档

> 版本：v0.1-MVP（修正版） | 2026-07-12

---

## 1. 产品定位对技术的约束

叩鸣·工坊 = **带价值宪法的 AI Agent 编排工坊**。这决定了技术选型的几个硬约束：

| 约束 | 来源 |
|------|------|
| 多 Agent 协作：至少 Planner + Creator 两个 Agent 串联执行 | 产品定位 |
| 宪法过滤器：每个 Agent 的输出必须经过宪法规则引擎检查 | 第0层产品宪法 |
| 用户自带 API Key 直连 DeepSeek | BYOK |
| AI 信息流不经我方服务器 | 红线 |
| 后端仅保留：许可验证、版本更新、静态 CDN | 红线 |
| 最终形态：本地安装应用（npm/brew/install script） | ICP 合规 |
| 架构参考：OpenAI Codex（规则引擎/插件/context/分发模式），但产品类别不同 | Codex 审计 |

---

## 2. 前端技术栈

### 2.1 框架与构建

| 选项 | 版本 | 理由 |
|------|:---:|------|
| React | ^19.2 | UI 框架，已在用 |
| Vite | ^8.1 | 构建工具，HMR 极快 |
| @vitejs/plugin-react | ^6.0 | React 编译 |

### 2.2 状态管理 → Zustand ^5

| 对比 | Zustand 5 | Redux Toolkit |
|------|-----------|---------------|
| 模板代码 | 极少 | 较多 |
| subscribeWithSelector | 支持（守护进程只需要订阅特定 slice） | 需 middleware |
| Agent 状态机适配 | 优秀 | 中等 |

**选择理由**：守护进程通过 `subscribeWithSelector` 只订阅 agent outputs slice，不修改编排状态——满足"独立于编排引擎"的架构要求。

### 2.3 AI SDK → Vercel AI SDK

| 工具 | 用途 |
|------|------|
| `ai` (core) | `generateText` + `streamText` + `tool` API，Agent 编排核心 |
| `@ai-sdk/deepseek` | DeepSeek Chat provider，用户自带 Key 直连 |

**Agent 编排模式**（借鉴 Codex plugin 注册模式）：

```javascript
// Agent 注册表
const agentRegistry = {
  planner: { role: 'planner', model: 'deepseek-chat', constitution_check: true },
  creator: { role: 'creator', model: 'deepseek-chat', constitution_check: true },
};

// 编排引擎
async function orchestrate(intent, agents) {
  const plan = await agents.planner.run(intent);
  const outputs = [];
  for (const task of plan.subtasks) {
    const output = await agents.creator.run(task);
    constitution.filter(output);  // 每个 Agent 输出必须过宪法
    outputs.push(output);
  }
  return outputs;
}
```

### 2.4 路由 → React Router ^7

MVP 路由：Dashboard / IntentWorkspace / AssemblyLine / PauseReflect / Settings

### 2.5 样式 → Tailwind CSS ^4

MVP 追求速度，不投入设计系统。

### 2.6 打包

| 阶段 | 形式 | 说明 |
|:----:|------|------|
| v0.1-0.2 | Web 应用（CloudBase 静态托管） | 快速迭代 |
| v0.3+ | Electron 本地应用 | npm/brew/install script 分发 |

**为什么 Electron 而非 Tauri**：
- 叩鸣 v0.3 需要 `child_process` 运行 Executor Agent 的 shell 命令
- Electron 原生支持 `child_process` + macOS Seatbelt 沙箱（借鉴 Codex）
- 全 JS 技术栈，不需要为了一个沙箱执行引入 Rust 学习成本
- v0.3 阶段引入 Electron 成本可控

---

## 3. 宪法规则引擎（借鉴 Codex execpolicy）

Codex execpolicy 的核心模式直接适用：

```
Codex: command → execpolicy.check() → allow/prompt/forbidden
叩鸣: agent_output → constitution.filter() → pass/warn/block
       shell_cmd  → shell_policy.check()  → allow(完全访问)/prompt(确认)/forbidden(永禁)
```

宪法规则引擎同时处理两类输入——Agent 文本输出（pass/warn/block）和 Shell 命令（四级权限）。

**实现**：

```javascript
// constitution/rules.js
export const DIGNITY_RULE = {
  type: 'dignity',
  condition: (output) => !output.includes_ai_identity(),
  decision: 'block',
  justification: '尊严宪法：AI 必须声明自己的身份',
  remedy: (output) => prepend_identity(output),
  test_cases: {
    match: [output_without_disclosure],    // 应触发
    not_match: [output_with_disclosure],   // 不应触发
  }
};
```

**借鉴 Codex 的内嵌测试**：每条规则自带 `match`/`not_match` 测试用例（即 `execpolicy` 的 `prefix_rule(match=[...], not_match=[...])`）。

---

## 4. Context / Token 预算（借鉴 Codex context management）

借鉴 Codex AGENTS.md 的规则：
- 上下文增量构建，不重写历史
- 无边界项设硬上限
- 每项不超过 10K tokens

叩鸣实现：

| 组件 | 预算 | 硬上限 |
|------|:---:|:-----:|
| 宪法文本 | 300 | 500 |
| Agent 角色 Prompt | 200 | 300 |
| 意图规格书 | 800 | 1000 |
| 溯源追问 | 200 | 300 |
| 价值观映射 | 150 | 200 |
| 知识库片段 | 500 | 800 |
| **总计** | **~2150** | **~3100** |

---

## 5. 后端（CloudBase，v0.2 接入）

| 函数 | 用途 | MVP 需要？ |
|------|------|:--:|
| `license-verify` | 验证激活码 | v0.2 |
| `version-check` | 返回最新版本号 | v0.2 |

v0.1 不需要后端，用户直接打开网页使用。

---

## 6. 分发方案（v0.3+，借鉴 Codex）

```
npm install -g kouming           # npm
brew install --cask kouming      # Homebrew
curl -fsSL kouming.app/install.sh | sh  # 通用安装脚本
```

---

## 7. 完整依赖

```json
{
  "dependencies": {
    "react": "^19.2",
    "react-dom": "^19.2",
    "react-router": "^7.5",
    "zustand": "^5.0",
    "ai": "^4.0",
    "@ai-sdk/deepseek": "^1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0",
    "vite": "^8.1",
    "tailwindcss": "^4.0",
    "@tailwindcss/vite": "^4.0",
    "vitest": "^3.0",
    "@testing-library/react": "^16.0",
    "@testing-library/user-event": "^14.0",
    "oxlint": "^1.71"
  }
}
```

---

## 8. 决策记录

| 决策 | 日期 | 来源 |
|------|------|------|
| 产品定位修正：Agent 编排工坊（非代码助手） | 2026-07-12 | 老板 + 三框架分析 |
| 最终形态：本地安装应用 | 2026-07-12 | 老板 + ICP合规 |
| 架构参考：Codex（规则引擎/plugin/context模式） | 2026-07-12 | Codex 审计 |
| 不舒服模式默认关闭 | 2026-07-12 | 老板 |
| MVP 两 Agent 最小编排（Planner + Creator） | 2026-07-12 | 技术选型 |
| Electron vs Tauri：选 Electron | 2026-07-12 | 技术选型 |
