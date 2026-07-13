# 叩鸣·工坊 — 数据通道图

> 版本：v0.1-MVP（修正版） | 2026-07-12

---

## 系统架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                    用户本地环境 (localhost / Electron)              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    叩鸣·工坊 应用                            │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              Agent Registry（借鉴 Codex plugin 模式）   │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │  │
│  │  │  │ Planner  │  │ Creator  │  │ Reviewer │  ...      │  │  │
│  │  │  │  Agent   │  │  Agent   │  │  Agent   │           │  │  │
│  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘           │  │  │
│  │  │       │             │             │                  │  │  │
│  │  │       └──────┬──────┴─────────────┘                  │  │  │
│  │  │              │                                        │  │  │
│  │  │     ┌────────┴────────┐                               │  │  │
│  │  │     │  编排引擎         │                               │  │  │
│  │  │     │  Orchestrator    │                               │  │  │
│  │  │     └────────┬────────┘                               │  │  │
│  │  └──────────────┼────────────────────────────────────────┘  │  │
│  │                 │                                            │  │
│  │  ┌──────────────┼──────────────────────────────────────┐   │  │
│  │  │              宪法层（借鉴 Codex execpolicy 规则引擎）  │   │  │
│  │  │                                                      │   │  │
│  │  │  每条 Agent 输出 → constitution.filter(output)       │   │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │  │
│  │  │  │ 尊严检查  │  │ 自主检查  │  │ 追问检查  │          │   │  │
│  │  │  │身份声明？ │  │替代方案？ │  │假设段落？ │          │   │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘          │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                 │                                            │  │
│  │  ┌──────────────┴──────────────────────────────────────┐   │  │
│  │  │     守护进程 Guardian（借鉴 Codex hooks 拦截模式）     │   │  │
│  │  │     • 订阅 agent outputs slice（只读，不修改）         │   │  │
│  │  │     • 独立于编排引擎（利益冲突方隔离）                  │   │  │
│  │  │     • 触发 → 阻断/警告 → 通过事件总线通知 UI           │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                          │         │
└──────────────────────────────┼──────────────────────────┼─────────┘
                               │                          │
                    通道A (蓝色)│               通道B (灰色)│
                    AI 调用     │               许可/版本    │
                    BYOK 直连    │                          │
                               ▼                          ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│     DeepSeek API          │  │     CloudBase (zhizhi-mcp)      │
│  https://api.deepseek.com │  │                                │
│                           │  │  • 静态托管 (CDN)               │
│  Planner: 拆解子任务       │  │  • 许可验证 (云函数 v0.2)       │
│  Creator: 逐个生成内容     │  │  • 版本更新 (云函数 v0.2)       │
│                           │  │                                │
│  AI 数据不经我方服务器      │  │  仅激活码 + 设备指纹 hash       │
│  = BYOK 核心红线           │  │  无用户内容/无行为数据           │
└──────────────────────────┘  └────────────────────────────────┘
```

---

## 三个数据通道

### 通道A（蓝色）：Agent 编排流 → DeepSeek 直连

每个 Agent 独立调用 DeepSeek，用户 API Key 存储在浏览器 localStorage：

| Agent | 调用时机 | System Prompt 组成 | Token 预算 |
|-------|---------|-------------------|:--------:|
| Planner | 意图确认后 | 宪法 + Planner角色 + 意图 + 溯源 + 价值观 | ~1500 |
| Creator | 每个子任务 | 宪法 + Creator角色 + 子任务 + Planner拆解依据 | ~1200 |

**红线**：我方服务器不得代理/缓存/修改任何 AI 调用。

### 通道B（灰色）：许可/版本流 → CloudBase

v0.1 不启用。v0.2 接入，仅传输激活码 + 设备指纹 hash。

### 通道C（红色）：宪法守护流 → 纯本地

```
Agent 输出 → constitution.filter(output)
                  │
        ┌─────────┼─────────┐
        │         │         │
      尊严检查   自主检查   追问检查
        │         │         │
    block/warn  warn/pass  append/pass
```

借鉴 Codex execpolicy 的三态决策：`allow | prompt | forbidden` → 叩鸣的 `pass | warn | block`。

两者共用同一个规则引擎——宪法过滤器既检查 Agent 文本输出，也检查 Shell 命令。

### 通道D（橙色）：Shell 执行流 → 本地沙箱（v0.3）

```
Agent 请求 Executor → Shell 权限策略检查
                           │
          ┌────────────────┼────────────────┐
          │                │                │
     allow(完全访问)    prompt(询问)    forbidden(永禁)
     → 自动执行          → 弹窗确认        → 直接阻断
          │                │
          └──────┬─────────┘
              用户确认 → 沙箱执行
                   │
        ┌──────────┼──────────┐
        │          │          │
    文件系统      网络        进程
    (项目目录)  (默认禁)   (禁子进程)
    (完全访问可扩展)
```

Shell 权限策略（四级模型，借鉴 execpolicy 三态 + 新增 allow）：

```javascript
SHELL_POLICY = [
  // 只读命令：默认 prompt，完全访问 => allow
  { pattern: ['cat', 'head', 'tail', 'wc', 'grep', 'ls', 'find'],
    decision: 'prompt', full_access_decision: 'allow', risk: 'low' },
  // 脚本执行：默认 prompt，完全访问 => allow
  { pattern: ['python', 'node', 'Rscript', 'jq'],
    decision: 'prompt', full_access_decision: 'allow', risk: 'medium' },
  // Git只读：默认 prompt，完全访问 => allow
  { pattern: ['git', 'status'], { pattern: ['git', 'diff'], { pattern: ['git', 'log'] },
    decision: 'prompt', full_access_decision: 'allow', risk: 'low' },
  // Git写入：永远 prompt
  { pattern: ['git', 'commit'], { pattern: ['git', 'push'] },
    decision: 'prompt', full_access_decision: 'prompt', risk: 'medium' },
  // 破坏性：永远 forbidden
  { pattern: ['rm', 'sudo', 'chmod', 'kill'],
    decision: 'forbidden', full_access_decision: 'forbidden',
    justification: '破坏性操作，不受完全访问影响' },
];
```

---

## 数据存储

| 数据 | 位置 | 服务器可见？ |
|------|------|:--:|
| 用户 API Key | localStorage | 否 |
| 意图规格书 | localStorage | 否 |
| Agent 输出历史 | IndexedDB | 否 |
| Shell 执行日志 | IndexedDB | 否 |
| 沙箱配置 | localStorage | 否 |
