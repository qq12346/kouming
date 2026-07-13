# 叩鸣·工坊 — 实施计划

> 版本：v0.1-MVP | 2026-07-12
>
> 前置阅读：prd.md / flow.md / channel.md / tech-stack.md

---

## 总览：四个 Wave，25 天

```
Wave 1 (Day 1-3)      Wave 2 (Day 4-10)        Wave 3 (Day 11-18)       Wave 4 (Day 19-25)
   价值骨架               核心体验                  完整引擎                 价值深化
      │                     │                        │                       │
  ┌────┴────┐         ┌─────┴──────┐          ┌─────┴──────┐          ┌─────┴──────┐
  │宪法编码  │         │意图规格书    │          │多Agent装配  │          │代偿审计    │
  │守护进程  │    →    │溯源追问     │    →     │知识库RAG    │    →     │价值侵蚀    │
  │暂停反思  │         │两Agent编排  │          │验证层       │          │减速点      │
  │项目骨架  │         │假设段落     │          │Shell执行    │          │完整守护    │
  └─────────┘         └────────────┘          └────────────┘          └────────────┘
```

每个 Wave 独立可运行、可演示。Wave 2 结束用户就能跑通完整闭环。

---

## Wave 1：价值骨架（Day 1-3）

**目标**：项目能跑，三条宪法已在代码中，暂停反思页面和守护进程基础版已就位。

**为什么先做这个**：宪法是系统底座。如果一个 Agent 能在没有宪法的情况下跑起来，后续加宪法就是"逆流修改"。宪法必须**先于任何 Agent 存在**。

### Day 1：项目初始化

| # | 任务 | 产出 | 验收 |
|---|------|------|------|
| 1.1 | `npm create vite` 初始化项目 | `package.json` / `vite.config.js` | `npm run dev` 成功 |
| 1.2 | 安装依赖 | Zustand / React Router / AI SDK / Tailwind | `npm ls` 全绿 |
| 1.3 | 创建目录结构 | 见下方 [目录结构] | 所有目录存在 |
| 1.4 | 配置 Tailwind + React Router | `src/main.jsx` / `src/App.jsx` | 首页渲染 |
| 1.5 | 配置 ESLint + Prettier | `.eslintrc` / `.prettierrc` | `npm run lint` 通过 |

**目录结构**：

```
src/
├── constitution/          # 第0层：三条宪法 + 规则引擎
│   ├── index.js           #   规则引擎核心（借鉴 execpolicy 模式）
│   ├── rules.js           #   三条宪法的编码定义
│   └── rules.test.js      #   每条规则的 match/not_match 测试
├── guardian/              # 守护进程
│   ├── index.js           #   后台监控，订阅 Zustand slices
│   └── index.test.js
├── agents/                # Agent 注册表 + 定义
│   ├── registry.js        #   Agent 注册（借鉴 plugin 模式）
│   ├── planner.js         #   规划 Agent（Wave 2 实现）
│   ├── creator.js         #   创作 Agent（Wave 2 实现）
│   └── executor.js        #   执行 Agent（Wave 3 实现）
├── orchestrator/          # 编排引擎
│   └── index.js           #   Agent 调度、依赖管理（Wave 2 实现）
├── context/               # Token 预算控制
│   └── builder.js         #   Context 构建器（借鉴 Codex context）
├── store/                 # Zustand 状态
│   ├── intentStore.js     #   意图规格书状态
│   ├── agentStore.js      #   Agent 执行状态（守护进程只读订阅）
│   └── userStore.js       #   用户偏好（API Key / 开关）
├── pages/
│   ├── Dashboard.jsx      #   主面板
│   ├── IntentWorkspace.jsx #   意图规格书 + 溯源追问（Wave 2）
│   ├── AssemblyLine.jsx   #   装配线视图（Wave 2）
│   ├── PauseReflect.jsx   #   暂停反思（Wave 1）
│   └── Settings.jsx       #   设置（API Key / 开关）
├── components/
│   └── Layout.jsx         #   导航布局
├── App.jsx
└── main.jsx
```

### Day 2：宪法编码 + 守护进程

| # | 任务 | 产出 | 验收 |
|---|------|------|------|
| 2.1 | 编码三条宪法规则 | `constitution/rules.js` | 每条规则有 match/not_match 测试 |
| 2.2 | 实现规则引擎 | `constitution/index.js` | `filter(output)` 返回 `{pass/warn/block, ...}` |
| 2.3 | 规则引擎单元测试 | `constitution/rules.test.js` | 全部 9 个测试通过（每宪法 3 个） |
| 2.4 | 实现守护进程基础版 | `guardian/index.js` | subscribe Agent outputs，检测尊严违反 |
| 2.5 | 守护进程单元测试 | `guardian/index.test.js` | 模拟违反 → 检测到阻断 |

**宪法规则编码示例**：

```javascript
// constitution/rules.js
export const DIGNITY_RULE = {
  type: 'dignity',
  condition: (output) => !output.includes('AI 生成') && !output.includes('AI-assisted'),
  decision: 'block',
  justification: '尊严宪法要求 AI 必须在输出中声明身份',
  remedy: (output) => '[叩鸣·工坊 AI 生成]\n\n' + output,
  test_cases: {
    match: ['这是分析报告的内容'],           // 应触发（缺声明）
    not_match: ['AI 生成：这是分析报告'],     // 不应触发
  }
};

export const AUTONOMY_RULE = {
  type: 'autonomy',
  condition: (output) => {
    const alternatives = (output.match(/替代方案/g) || []).length;
    return alternatives < 2;
  },
  decision: 'warn',
  justification: '自主宪法要求每次输出至少提供 2 个替代方案',
  remedy: (output) => output + '\n\n替代方案：\n1. [请补充]\n2. [请补充]',
  test_cases: {
    match: ['只有一个方案的输出'],
    not_match: ['替代方案：A 替代方案：B'],
  }
};

export const QUESTIONING_RULE = {
  type: 'questioning',
  condition: (output) => !output.includes('我假设') && !output.includes('我的假设'),
  decision: 'warn',
  justification: '追问宪法要求 AI 必须声明自己的前提假设',
  remedy: (output) => output + '\n\n我的假设：\n1. [系统补全] 我假设你优先考虑准确性。',
  test_cases: {
    match: ['没有假设段落的输出'],
    not_match: ['我的假设：1. 我假设...'],
  }
};
```

### Day 3：暂停反思 + 基础 UI

| # | 任务 | 产出 | 验收 |
|---|------|------|------|
| 3.1 | 基础布局组件 | `components/Layout.jsx` | 导航栏 + 内容区 |
| 3.2 | 暂停反思页面 | `pages/PauseReflect.jsx` | 极简页面：标题 + 文本框 + 保存 |
| 3.3 | 设置页面 | `pages/Settings.jsx` | API Key 输入 + 不舒服模式开关 + Shell 开关（灰显） |
| 3.4 | 路由配置 | `App.jsx` | / → Dashboard, /reflect → PauseReflect, /settings → Settings |
| 3.5 | Dashboard 骨架 | `pages/Dashboard.jsx` | 欢迎页 + 新建任务入口 |

**Wave 1 验收标准**：
- [ ] `npm run dev` 启动，三个页面可导航
- [ ] 暂停反思页面可输入文字并保存到 localStorage
- [ ] 设置页面可输入 API Key 并持久化
- [ ] 宪法规则引擎 9 个测试全部通过
- [ ] 守护进程基础测试通过
- [ ] `npm run build` 构建成功

---

## Wave 2：核心体验（Day 4-10）

**目标**：用户能完成"意图→溯源追问→价值观确认→两Agent编排→审视假设"完整闭环。

### Day 4-5：意图规格书 + 溯源追问 + 价值观

| # | 任务 | 产出 | 验收 |
|---|------|------|------|
| 4.1 | 意图规格书表单 | `pages/IntentWorkspace.jsx` | 四个字段 + 提交 |
| 4.2 | 意图状态管理 | `store/intentStore.js` | 意图保存/读取 |
| 4.3 | 溯源追问步骤 | 集成在 IntentWorkspace 中 | 三问题 + 跳过逻辑 |
| 4.4 | 价值观推断 + 确认 | 集成在 IntentWorkspace 中 | 自动推断 + 用户修改 |
| 4.5 | Context Builder | `context/builder.js` | 按 token 预算拼接 system prompt |

### Day 6-8：两 Agent 编排引擎

| # | 任务 | 产出 | 验收 |
|---|------|------|------|
| 6.1 | Agent 注册表 | `agents/registry.js` | 注册 Planner + Creator |
| 6.2 | Planner Agent | `agents/planner.js` | 输入意图 → DeepSeek → 子任务列表 |
| 6.3 | Creator Agent | `agents/creator.js` | 输入子任务 → DeepSeek → 内容 + 假设 |
| 6.4 | 编排引擎 | `orchestrator/index.js` | Planner → Creator 接力调度 |
| 6.5 | 宪法过滤集成 | 编排引擎中调用 `constitution.filter()` | 每个 Agent 输出过宪法 |
| 6.6 | 状态管理 | `store/agentStore.js` | Agent 执行状态 + 输出历史 |

### Day 9-10：UI + 假设段落 + "自己做"开关

| # | 任务 | 产出 | 验收 |
|---|------|------|------|
| 9.1 | 装配线视图 | `pages/AssemblyLine.jsx` | 显示 Planner 拆解 + Creator 生成 |
| 9.2 | "我假设"段落渲染 | AssemblyLine 中 | 每个输出末尾自动展示 |
| 9.3 | 假设反驳交互 | AssemblyLine 中 | 点击"不对" → 重生成 |
| 9.4 | "自己做"开关 | AssemblyLine 中 | 开关→编辑器→提交→继续编排 |
| 9.5 | 端到端集成测试 | 人工走通完整流程 | 意图→追问→Planner→Creator→假设→反驳 |

**Wave 2 验收标准**：
- [ ] 用户可以创建意图、经过溯源追问、确认价值观
- [ ] Planner 能拆解意图为 2-5 个子任务
- [ ] Creator 能对每个子任务生成内容
- [ ] 每个 Agent 输出末尾自动附带"我的假设"段落
- [ ] 用户可反驳假设并触发重生成
- [ ] 用户可以手动关掉某步并自己完成
- [ ] 完整流程 < 30 秒（取决于 DeepSeek 响应速度）

---

## Wave 3：完整引擎（Day 11-18）

### Day 11-13：多 Agent 完整装配线

| # | 任务 | 产出 |
|---|------|------|
| 11.1 | Researcher Agent | `agents/researcher.js`（信息调研） |
| 11.2 | Reviewer Agent | `agents/reviewer.js`（质量审查） |
| 11.3 | 完整装配线 | Planner → Researcher → Creator → Reviewer |
| 11.4 | 并行执行支持 | 独立子任务并行调用 Creator |
| 11.5 | Agent 间上下文传递 | Planner 拆解依据 → Creator 输入 |

### Day 14-15：知识库 + RAG

| # | 任务 | 产出 |
|---|------|------|
| 14.1 | 知识库上传 | 文件上传 + 文本提取 |
| 14.2 | 向量索引 | 本地嵌入（local embedding）+ 向量存储 |
| 14.3 | RAG 检索 | 意图相关片段检索 → 注入 Context |
| 14.4 | 知识溯源面板 | 每条信息来源标注 |

### Day 16-18：Shell 执行 + 沙箱（v0.3 提前到 Wave 3 开发）

| # | 任务 | 产出 |
|---|------|------|
| 16.1 | Executor Agent | `agents/executor.js` |
| 16.2 | Shell 权限策略引擎 | 四级权限模型（allow/prompt/warn/forbid） |
| 16.3 | 沙箱实现 | child_process + 文件系统/网络/进程隔离 |
| 16.4 | 用户确认 UI | 命令弹窗 + 风险标注 + 确认/拒绝/预览 |
| 16.5 | 完全访问模式 | 白名单管理 + 自动执行 |

---

## Wave 4：价值深化（Day 19-25）

### Day 19-21：代偿审计 + 价值侵蚀

| # | 任务 | 产出 |
|---|------|------|
| 19.1 | 代偿审计面板 | 独立指标：跳过率/独立完成度/追问频率 |
| 19.2 | 价值侵蚀指标完整版 | 尊严指数+替代性暴露度+能力保留度+追问频率 |
| 19.3 | 指标与效率指标并列同权 | 价值全红 → 系统红色状态 |
| 19.4 | 周期性价值审计报告 | 月度自动生成 |

### Day 22-25：减速点 + 完整守护

| # | 任务 | 产出 |
|---|------|------|
| 22.1 | 减速点机制 | 快速改善→暂停→展示数据→用户确认 |
| 22.2 | 指标漂移审计 | 季度阈值变化报告 |
| 22.3 | 守护进程完整版 | 全部五项监控 |

---

## 技术架构速查

### Zustand Store 设计

```javascript
// agentStore.js — 守护进程只读订阅
{
  agentOutputs: [
    { agent: 'planner', output: '...', filtered: true, constitution: 'pass' },
    { agent: 'creator', output: '...', filtered: true, constitution: 'warn' },
  ],
  currentStep: 2,
  totalSteps: 5,
}

// userStore.js — UI 和设置
{
  apiKey: 'sk-...',
  uncomfortableMode: false,
  shellEnabled: false,
  shellFullAccess: false,
  shellWhitelist: ['cat', 'ls', 'wc'],
}
```

### 路由结构

```
/                    → Dashboard
/intent/new          → IntentWorkspace（新建意图）
/intent/:id          → IntentWorkspace（编辑意图）
/assembly/:id        → AssemblyLine（查看执行）
/reflect             → PauseReflect
/settings            → Settings
```

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| DeepSeek API 不稳定 | 内置重试机制（3次）+ 错误友好提示 |
| Agent 输出质量不可控 | 宪法过滤器作为最低质量保障 |
| Context token 超预算 | builder 内置截断 + 预算警告 |
| MVP 功能太多 | 每个 Wave 独立可运行，Wave 2 即最小可演示版本 |
