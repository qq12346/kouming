# Wave 2 详细计划：核心体验

> 父文档：`plan.md` | 周期：Day 4-10 | 用户能跑通"意图→追问→编排→假设→反驳"完整闭环

---

## 模块 M2-1：意图规格书 + 溯源追问 + 价值观

**交付物**：`pages/IntentWorkspace.jsx` 完整实现——三步向导（规格书→溯源→价值观）。

**宪法对齐**：溯源追问步骤不可被默认跳过。价值观推断的结果必须**可修改**——用户永远保留"定义什么是好"的权力。

### 任务 M2-1.1：intentStore 完整实现

| 属性 | 值 |
|------|-----|
| 输入 | Wave 1 `store/intentStore.js` 骨架 |
| 输出 | 完整的 intent Store：`intent / trace / values / status` |
| 验收 | 创建意图 → 填写溯源 → 确认价值观 → Store 中完整记录 |
| 文件 | `src/store/intentStore.js` |

**数据结构**：

```javascript
{
  intent: {
    goal: '',        // 目标
    background: '',  // 背景
    constraints: '', // 约束
    successCriteria: '', // 成功标准
  },
  trace: {
    serves: '',       // 服务于谁？
    definedGood: '',  // 谁定义的好？
    alternative: '',  // 有什么更重要的？（可选）
    skipped: false,   // 是否跳过
  },
  values: {
    speed: 'speed',     // speed | accuracy | ...
    coverage: 'coverage', // coverage | focus | ...
    novelty: 'novelty',  // novelty | feasibility | ...
  },
  status: 'draft' | 'traced' | 'valued' | 'confirmed',
}
```

### 任务 M2-1.2：意图规格书表单（Step 1/3）

| 属性 | 值 |
|------|-----|
| 输入 | M2-1.1 |
| 输出 | IntentWorkspace Step 1 — 四个字段 + 提交按钮 |
| 验收 | 填写→提交→跳转 Step 2。必填项为空时提示。 |
| 文件 | `src/pages/IntentWorkspace.jsx`（Step 1 部分） |

### 任务 M2-1.3：溯源追问（Step 2/3）

| 属性 | 值 |
|------|-----|
| 输入 | M2-1.2 |
| 输出 | IntentWorkspace Step 2 — 三个问题（前二必填）+ "跳过"按钮 |
| 验收 | 前二为空时"确认继续"灰显。"跳过"按钮文本："跳过（我确认不需要追问）"。跳过记录到 store。 |
| 宪法对齐 | 跳过是**主动选择**——必须点击"跳过"按钮，不能默认不展示这一步 |
| 文件 | `src/pages/IntentWorkspace.jsx`（Step 2 部分） |

### 任务 M2-1.4：价值观显性化（Step 3/3）

| 属性 | 值 |
|------|-----|
| 输入 | M2-1.3 |
| 输出 | IntentWorkspace Step 3 — 三条价值观（每条约 3-4 个选项） |
| 验收 | 基于意图关键词自动推断默认值 → 用户可逐条修改 → 确认后进入编排 |
| 文件 | `src/pages/IntentWorkspace.jsx`（Step 3 部分） |

**推断逻辑**：

```javascript
const DEFAULT_VALUES = {
  speed: { label: '快速=好', options: ['快速', '准确', '深度'], default: '快速' },
  coverage: { label: '全面=好', options: ['全面', '聚焦', '关键点'], default: '全面' },
  novelty: { label: '创新=好', options: ['创新', '可行', '可靠'], default: '创新' },
};

function inferValues(intent) {
  // 简单关键词推断
  if (intent.goal.includes('分析') || intent.goal.includes('研究')) {
    return { speed: '深度', coverage: '全面', novelty: '创新' };
  }
  if (intent.goal.includes('快速') || intent.goal.includes('总结')) {
    return { speed: '快速', coverage: '关键点', novelty: '可靠' };
  }
  return { speed: '快速', coverage: '全面', novelty: '创新' };
}
```

---

## 模块 M2-2：Context Builder + Agent 注册表

**交付物**：`context/builder.js` — Token 预算控制的 system prompt 构建器。`agents/registry.js` — Agent 注册表。

### 任务 M2-2.1：Token 预算控制

| 属性 | 值 |
|------|-----|
| 输入 | 无（独立模块） |
| 输出 | `context/builder.js` |
| 验收 | 输入宪法+意图+溯源+价值观 → 输出 system prompt string，每部分不超过预算 |
| 文件 | `src/context/builder.js` |

**预算常量**：

```javascript
export const TOKEN_BUDGET = {
  constitution: { max: 500, estimate: (text) => Math.ceil(text.length / 2) },
  agentRole: { max: 300, estimate: (text) => Math.ceil(text.length / 2) },
  intent: { max: 1000, estimate: (text) => Math.ceil(text.length / 2) },
  trace: { max: 300, estimate: (text) => Math.ceil(text.length / 2) },
  values: { max: 200, estimate: (text) => Math.ceil(text.length / 2) },
  total: 2300,
};
```

### 任务 M2-2.2：Agent 注册表

| 属性 | 值 |
|------|-----|
| 输入 | 无（独立模块） |
| 输出 | `agents/registry.js` |
| 验收 | `register(agent)` / `get('planner')` / `list()` 正常 |
| 文件 | `src/agents/registry.js` |

**接口**：

```javascript
// Agent 注册
register({
  name: 'planner',
  role: 'planner',
  description: '将用户意图拆解为可执行的子任务',
  requiresConstitution: true,  // 宪法必须注入
});

// 获取 Agent
get('planner') → AgentDefinition
```

---

## 模块 M2-3：Planner Agent

**交付物**：`agents/planner.js` — 接收意图，返回子任务拆解。

### 任务 M2-3.1：Planner 实现

| 属性 | 值 |
|------|-----|
| 输入 | M2-2.1（Context Builder）/ M2-2.2（注册表） |
| 输出 | `agents/planner.js` |
| 验收 | 输入意图规格书 → DeepSeek 调用 → 返回 `{subtasks: [...], reasoning: '...'}` |
| 宪法对齐 | Planner 的 system prompt 中注入完整宪法文本。Planner 输出经 `constitution.filter()` 检查后返回。 |
| 文件 | `src/agents/planner.js` |

**System Prompt 设计**：

```
你是叩鸣·工坊的 Planner Agent。你的任务是拆解用户的意图。

[宪法约束]
{constitution_text}

[当前意图]
{intent}

[用户的价值观偏好]
{values}

[任务]
请将以上意图拆解为 2-5 个可独立执行的子任务。每个子任务应该：
1. 有明确的目标和产出
2. 之间有逻辑顺序
3. 考虑用户的价值观偏好

输出格式（JSON）：
{
  "subtasks": [
    {"id": 1, "title": "...", "goal": "...", "dependsOn": []},
    ...
  ],
  "reasoning": "我为什么这样拆解..."
}
```

### 任务 M2-3.2：Planner 单元测试

| 属性 | 值 |
|------|-----|
| 输入 | M2-3.1 |
| 输出 | `agents/planner.test.js` |
| 验收 | Mock DeepSeek 返回 → 输出格式正确 → 宪法过滤通过 |

---

## 模块 M2-4：Creator Agent + 编排引擎

**交付物**：`agents/creator.js` + `orchestrator/index.js`——两 Agent 接力执行。

### 任务 M2-4.1：Creator 实现

| 属性 | 值 |
|------|-----|
| 输入 | M2-2.1 / M2-2.2 |
| 输出 | `agents/creator.js` |
| 验收 | 输入子任务 → DeepSeek 调用 → 返回内容 + 自动附带"我的假设"段落 |
| 文件 | `src/agents/creator.js` |

**System Prompt 追加指令**：

```
在输出末尾，你必须附加一个"我的假设"段落。格式：
---
我的假设：
1. 我假设你更关心 [速度/准确性/...] — 因为你的价值观设定为 {values}
2. 我假设你的目标受众是 [推断] — 基于你的意图描述
3. 我假设你希望 [确定性结论/保留不确定性/...] — 基于任务性质
```

### 任务 M2-4.2：编排引擎实现

| 属性 | 值 |
|------|-----|
| 输入 | M2-3.1 / M2-4.1 |
| 输出 | `orchestrator/index.js` |
| 验收 | `orchestrate(intent)` → Planner.run() → 获取子任务 → 逐个 Creator.run() → 返回合并结果 |
| 文件 | `src/orchestrator/index.js` |

**编排流程**：

```
1. 构建 system prompt（Context Builder）
2. Planner.run(intent) → {subtasks, reasoning}
3. constitution.filter(plannerOutput) → 通过/阻断
4. for each subtask:
     Creator.run(subtask) → {content, assumptions}
     constitution.filter(creatorOutput)
5. 合并 → 返回给用户
```

### 任务 M2-4.3：agentStore 完整实现

| 属性 | 值 |
|------|-----|
| 输入 | Wave 1 `store/agentStore.js` 骨架 / M2-4.2 |
| 输出 | 完整 agentStore |
| 验收 | 编排过程中 `agentOutputs` 实时更新 / 守护进程可订阅 `agentOutputs` 变化 |

---

## 模块 M2-5：装配线 UI + 假设段落 + "自己做"开关

### 任务 M2-5.1：装配线视图

| 属性 | 值 |
|------|-----|
| 输入 | M2-4.2 / M2-4.3 |
| 输出 | `pages/AssemblyLine.jsx` |
| 验收 | 显示 Planner 拆解树 + Creator 流式生成内容 + 进度条 |
| 文件 | `src/pages/AssemblyLine.jsx` |

### 任务 M2-5.2："我假设"渲染 + 反驳交互

| 属性 | 值 |
|------|-----|
| 输入 | M2-5.1 |
| 输出 | AssemblyLine 中"假设段落"渲染 + "不对"按钮 + 反驳后重生成 |
| 验收 | 点击"不对"→ 输入修正 → Creator 重新调用 DeepSeek → 更新内容 |
| 宪法对齐 | 反驳是用户行驶"定义权"的物理入口 |

### 任务 M2-5.3："自己做"开关

| 属性 | 值 |
|------|-----|
| 输入 | M2-5.1 |
| 输出 | 每个子任务旁边的开关 → 点击后切换为编辑器模式 |
| 验收 | 开关→编辑器→输入内容→提交→编排继续（跳过该子任务的 Creator 调用） |
| 文件 | `src/pages/AssemblyLine.jsx`（内联组件） |

### 任务 M2-5.4：Wire 全流程

| 属性 | 值 |
|------|-----|
| 输入 | M2-1 / M2-2 / M2-3 / M2-4 / M2-5 |
| 输出 | IntentWorkspace "确认执行" → AssemblyLine → 完整编排 → 结果展示 |
| 验收 | 人工走通完整流程：创建意图→溯源→价值观→Planner→Creator→假设→反驳 |
| 依赖 | 以上全部 |

---

## Wave 2 完成检查清单

- [ ] 用户可创建意图，经过三步向导
- [ ] 溯源追问步骤不可被默认跳过
- [ ] 价值观可被逐条修改
- [ ] Planner 返回 2-5 个子任务 + 拆解依据
- [ ] Creator 对每个子任务生成内容 + 自动附带"我的假设"
- [ ] 每个 Agent 输出经过宪法过滤器
- [ ] 用户可反驳假设 → 内容重生成
- [ ] 用户可开启"自己做"开关 → 手动编辑 → 编排继续
- [ ] 完整流程端到端可跑通
- [ ] `npm run build` 无错误
