# Wave 1 详细计划：价值骨架

> 父文档：`plan.md` | 周期：Day 1-3 | 宪法先行——任何 Agent 存在之前，宪法必须先落地

---

## 拆解原则

三个框架定义的粒度边界：每个计划项 = 一个**宪法约束下的独立可验证交付单元**。人能审查、AI 能生成、测试能覆盖。

---

## 模块 M1-1：项目骨架

**交付物**：能 `npm run dev` 启动的空项目，路由和基础布局就位。

**宪法对齐**：骨架本身不含任何 Agent 代码——确保"宪法先于 Agent 存在"的架构原则在物理文件层成立。

### 任务 M1-1.1：初始化 Vite 项目

| 属性 | 值 |
|------|-----|
| 输入 | 无 |
| 输出 | `package.json` / `vite.config.js` / `index.html` / `src/main.jsx` / `src/App.jsx` |
| 验收 | `npm run dev` → 浏览器显示 "Hello 叩鸣" |
| 依赖 | 无 |

### 任务 M1-1.2：安装依赖

| 属性 | 值 |
|------|-----|
| 输入 | `package.json` |
| 输出 | `node_modules/` 含 react / react-router / zustand / ai / @ai-sdk/deepseek |
| 验收 | `npm ls react zustand react-router ai` 全部显示版本号 |
| 依赖 | M1-1.1 |

### 任务 M1-1.3：配置 Tailwind + 路由

| 属性 | 值 |
|------|-----|
| 输入 | M1-1.1 |
| 输出 | 路由可导航的三个页面占位：`/` `/reflect` `/settings` |
| 验收 | 点击导航栏三个链接，页面切换，URL 变化 |
| 依赖 | M1-1.2 |

### 任务 M1-1.4：创建完整目录结构

| 属性 | 值 |
|------|-----|
| 输入 | 无 |
| 输出 | 所有目录：`constitution/` `guardian/` `agents/` `orchestrator/` `context/` `store/` `pages/` `components/` |
| 验收 | `ls -d src/*/` 列出 8 个目录 |
| 依赖 | 无（可与 M1-1.1 并行） |

---

## 模块 M1-2：宪法规则引擎

**交付物**：`constitution/` 目录完整实现——规则引擎 + 三条规则 + 测试。

**宪法对齐**：这是产品第 0 层的物理实现。三条宪法（尊严/自主/追问）在此刻变成代码：不可拔插、不可绕过。

### 任务 M1-2.1：规则引擎核心

| 属性 | 值 |
|------|-----|
| 输入 | 无 |
| 输出 | `constitution/index.js` — `filter(output: string) => {status, violations, remedied}` |
| 验收 | 单独运行 `import { filter } from './constitution'` → 传入无声明文本 → 返回 `{status: 'block', violations: [{type: 'dignity', ...}]}` |
| 依赖 | 无 |
| 文件 | `src/constitution/index.js` |

**接口定义**：

```javascript
// filter 函数签名
filter(output: string): {
  status: 'pass' | 'warn' | 'block',
  violations: Array<{
    rule: 'dignity' | 'autonomy' | 'questioning',
    decision: 'warn' | 'block',
    justification: string,
  }>,
  remediedOutput: string,  // 经过 remedy 处理后的输出（如有违规）
  originalOutput: string,
}
```

### 任务 M1-2.2：三条宪法规则定义

| 属性 | 值 |
|------|-----|
| 输入 | M1-2.1 |
| 输出 | `constitution/rules.js` — `DIGNITY_RULE` / `AUTONOMY_RULE` / `QUESTIONING_RULE` |
| 验收 | 每条规则包含 `type / condition / decision / justification / remedy / test_cases` 六个字段 |
| 依赖 | M1-2.1 |
| 文件 | `src/constitution/rules.js` |

**规则设计**（已在 `plan.md` 中定义，此处为实现）：

```javascript
export const RULES = [
  {
    type: 'dignity',
    condition: (text) => !/AI[-\s]?(生成|assisted)/i.test(text),
    decision: 'block',
    justification: '尊严宪法：AI 必须声明身份，用户有权知道 AI 正在参与',
    remedy: (text) => '[叩鸣·工坊 AI 参与]\n\n' + text,
  },
  {
    type: 'autonomy',
    condition: (text) => (text.match(/替代方案|alternative/g) || []).length < 2,
    decision: 'warn',
    justification: '自主宪法：每次输出至少提供 2 个不同的替代路径',
    remedy: (text) => text + '\n\n---\n替代方案：\n1. [请补充]\n2. [请补充]',
  },
  {
    type: 'questioning',
    condition: (text) => !/我(的)?假设|前提判断/i.test(text),
    decision: 'warn',
    justification: '追问宪法：AI 必须声明自己的前提假设，让价值判断显性化',
    remedy: (text) => text + '\n\n---\n我的假设：\n1. [系统补全] 我在生成以上内容时做了一些前提判断，请审视。',
  },
];
```

### 任务 M1-2.3：规则引擎单元测试

| 属性 | 值 |
|------|-----|
| 输入 | M1-2.2 |
| 输出 | `constitution/rules.test.js` — 9 个测试用例（每规则 3 个：触发/不触发/边界） |
| 验收 | `npx vitest run constitution/` → 9/9 通过 |
| 依赖 | M1-2.2 |
| 文件 | `src/constitution/rules.test.js` |

**测试用例清单**：

```
尊严规则：
  ✓ 缺少 AI 声明的文本 → 触发 block
  ✓ 含 "AI 生成" 的文本 → 不触发
  ✓ 含 "AI-assisted" 的文本 → 不触发

自主规则：
  ✓ 不含 "替代方案" 的文本 → 触发 warn
  ✓ 包含 2 个 "替代方案" 的文本 → 不触发
  ✓ 包含 1 个 "替代方案" + 1 个 "alternative" → 不触发（跨语言计数）

追问规则：
  ✓ 不含 "我假设" 的文本 → 触发 warn
  ✓ 含 "我的假设" 的文本 → 不触发
  ✓ 含 "前提判断" 的文本 → 不触发
```

---

## 模块 M1-3：守护进程基础版

**交付物**：`guardian/` 目录——独立于编排引擎的后台监控进程。

**宪法对齐**：守护进程不能与编排引擎同体。它通过 Zustand `subscribeWithSelector` 只读订阅 `agentOutputs` slice，检测到违反后通过独立事件总线通知 UI——不直接操作 Agent 状态。

### 任务 M1-3.1：守护进程核心

| 属性 | 值 |
|------|-----|
| 输入 | M1-2.1（依赖规则引擎） |
| 输出 | `guardian/index.js` |
| 验收 | 在测试中模拟 Agent 输出流 → 尊严违规 → Guardian 检测到并通过事件通知 |
| 依赖 | M1-2.1 |
| 文件 | `src/guardian/index.js` |

**接口**：

```javascript
// Guardian 初始化
initGuardian(store): void  // 传入 Zustand store，订阅 agentOutputs

// 内部事件（通过 EventTarget 广播）
events: {
  'guardian:dignity-violation': { output, rule, timestamp },
  'guardian:autonomy-warning': { output, rule, timestamp },
  'guardian:questioning-warning': { output, rule, timestamp },
}
```

### 任务 M1-3.2：守护进程测试

| 属性 | 值 |
|------|-----|
| 输入 | M1-3.1 |
| 输出 | `guardian/index.test.js` |
| 验收 | 3 个测试：尊严违反检测 / 自主警告检测 / 追问警告检测 |
| 依赖 | M1-3.1 |
| 文件 | `src/guardian/index.test.js` |

---

## 模块 M1-4：State 最小集

**交付物**：Zustand stores 骨架——`userStore` 完整实现，`agentStore` / `intentStore` 骨架。

### 任务 M1-4.1：userStore

| 属性 | 值 |
|------|-----|
| 输入 | 无 |
| 输出 | `store/userStore.js` |
| 验收 | `apiKey` 可读写 + 持久化到 localStorage / `uncomfortableMode` + `shellEnabled` + `shellFullAccess` 可切换 |
| 文件 | `src/store/userStore.js` |

### 任务 M1-4.2：agentStore 骨架 + intentStore 骨架

| 属性 | 值 |
|------|-----|
| 输入 | 无 |
| 输出 | `store/agentStore.js` + `store/intentStore.js` |
| 验收 | agentStore 定义 `agentOutputs: []`，支持订阅（用于 Guardian 验证）|
| 文件 | `src/store/agentStore.js` `src/store/intentStore.js` |

---

## 模块 M1-5：UI 骨架

**交付物**：导航布局 + 三个页面（暂停反思 / 设置 / Dashboard）。

### 任务 M1-5.1：Layout 组件

| 属性 | 值 |
|------|-----|
| 输入 | M1-1.3 |
| 输出 | `components/Layout.jsx` — 侧边栏导航 + 内容区 |
| 验收 | 三个导航项（Dashboard / 暂停反思 / 设置），点击切换 |
| 文件 | `src/components/Layout.jsx` |

### 任务 M1-5.2：暂停反思页面

| 属性 | 值 |
|------|-----|
| 输入 | M1-5.1 |
| 输出 | `pages/PauseReflect.jsx` |
| 验收 | 标题 + 提示文字 + 文本框 + 保存按钮 → 内容持久化到 localStorage → 不进入任何 store 的飞轮 slice |
| 宪法对齐 | 此页面的数据**不得**被任何优化/推荐/分析系统访问 |
| 文件 | `src/pages/PauseReflect.jsx` |

### 任务 M1-5.3：设置页面

| 属性 | 值 |
|------|-----|
| 输入 | M1-4.1 / M1-5.1 |
| 输出 | `pages/Settings.jsx` |
| 验收 | API Key 输入框（带遮罩）/ 不舒服模式开关（默认关）/ Shell 执行开关（灰显，标注"v0.3"）/ 完全访问开关（灰显） |
| 文件 | `src/pages/Settings.jsx` |

### 任务 M1-5.4：Dashboard 骨架

| 属性 | 值 |
|------|-----|
| 输入 | M1-5.1 |
| 输出 | `pages/Dashboard.jsx` |
| 验收 | 欢迎文案 + "新建任务"按钮（点击跳转提示"Wave 2 上线"） |
| 文件 | `src/pages/Dashboard.jsx` |

---

## Wave 1 完成检查清单

- [ ] 项目可运行，三个页面可导航
- [ ] `constitution/filter()` 对三条规则全部正确响应
- [ ] 宪法规则 9 个测试全部通过
- [ ] 守护进程单元测试通过
- [ ] 暂停反思页面输入可保存到 localStorage
- [ ] API Key 可输入并持久化
- [ ] `npm run build` 无错误
- [ ] 整个 `src/` 目录中**没有任何 Agent 实现代码**（agents/ 只有空注册表，orchestrator/ 为空）
