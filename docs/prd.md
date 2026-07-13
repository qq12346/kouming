# 叩鸣·工坊 — 产品需求文档（PRD）

> 版本：v0.1-MVP（修正版） | 2026-07-12
>
> 定位修正：叩鸣·工坊不是"又一个 Codex"，而是**带价值宪法的 AI Agent 编排工坊**。
> 前置文档：[七层AI系统·价值嵌入版 产品概念文档](/Users/work/WorkBuddy/思考/七层AI系统_价值嵌入版_产品概念文档.md)
>
> 架构参考：OpenAI Codex（execpolicy 规则引擎 / plugin 架构 / context management / 分发模式），但产品类别完全不同。

---

## 1. 产品定位

### 一句话

叩鸣·工坊是一个 AI Agent 编排工坊——你定义意图，多个 AI Agent 协作规划、执行、审查，产出知识工作成果。同时追问你"这个意图值得吗？"

### 竞争坐标

```
                    价值嵌入深度 ↑
                                 │
            CrewAI / AutoGen     │  ★ 叩鸣·工坊
            MetaGPT              │  （唯一有价值观立场的
            （多Agent·效率至上）   │    多Agent编排系统）
                                 │
            ─────────────────────┼──────────────────→ Agent编排复杂度
            ChatGPT / Claude     │  OpenAI Codex
            （单轮对话·无编排）     │  （单Agent·代码沙箱）
```

### 不可约核心

叩鸣·工坊 = **多 Agent 知识工作编排 + 价值宪法约束 + 守护进程审计**

它不是：
- 代码助手（那是 Codex / Cursor）
- 开发者框架（那是 CrewAI / AutoGen，面向 programmer 而非 end-user）
- 聊天机器人（那是 ChatGPT / Claude）

它是：**把 CrewAI 级别的多 Agent 编排能力，以可安装本地应用的形式，交付给终端用户——同时内嵌了"效率不是唯一价值"的宪法约束。**

---

## 2. 用户画像

### Persona A：独立知识工作者

- **身份**：研究员、写作者、分析师、策略顾问
- **日常**：写报告、做研究、整理信息、做决策分析
- **当前**：用 ChatGPT/Claude 单轮问答 → 手动拼接结果 → 感觉效率高但没深度
- **痛点**：想要多 Agent 协作（一个规划、一个调研、一个审查），但不会用 CrewAI 写代码
- **叩鸣给它的**：图形化定义意图 → 多 Agent 自动协作 → 拿到结构化成果 + 价值审视

### Persona B：小团队负责人

- **身份**：2-5 人团队的 Lead
- **日常**：分配任务、追踪进度、审核成果
- **痛点**：AI 在替团队做越来越多决策，但没人追问"这些决策对吗？"
- **叩鸣给它的**：宪法约束下的 Agent 编排 → 所有 AI 输出附带"我假设了什么" → 守护进程监控

---

## 3. Agent 架构（修正）

叩鸣的核心是多 Agent 协作，**认知 + 执行**：

| Agent | 角色 | 输入 | 输出 | Codex 类比 |
|-------|------|------|------|-----------|
| Planner | 任务拆解 | 意图规格书 + 宪法约束 | 子任务列表 + "为什么这样拆" | 无 |
| Creator | 内容生成 | 子任务 + 上下文 | 内容初稿 + "我的假设" | 无 |
| Executor | Shell 执行 | 子任务 + 沙箱约束 | 命令输出 + "为什么跑这个命令" | **codex-rs agent 核心** |
| Reviewer | 质量审查 | 初稿 + 审查标准 | 审查意见 | 无 |
| Guardian | 价值守护 | 所有 Agent 输出 | 通过/阻断/警告 | **execpolicy 模块** |

**Codex 借鉴点**：
- `codex-execpolicy` 的规则引擎 → 叩鸣宪法过滤器 + **Shell 权限策略**
- `codex-rs` 的沙箱执行 → 叩鸣 Executor Agent 的沙箱模式
- `codex-core/context` 的 token 预算 → 叩鸣 Context Builder
- `codex-plugin` 的注册模式 → 叩鸣 Agent Registry
- `hooks` 的生命周期拦截 → 叩鸣 before_execute / after_output hooks

---

## 4. MVP 功能列表

| P | 功能 | 层 | User Story |
|:--:|------|:---:|:----------:|
| P0 | 意图规格书 + 溯源追问 | L2 | US-01 |
| P0 | 价值观显性化 | L2 | US-02 |
| P0 | 多 Agent 协作执行（Planner + Creator 两 Agent 最小集） | L3 | US-03 |
| P0 | "我自己做这一步"开关 | L3 | US-04 |
| P1 | AI 输出"我假设了什么"段落 | L7a | US-05 |
| P1 | 暂停—反思模式 | L7b | US-06 |
| P1 | 宪法守护进程基础版 | Guardian | US-07 |
| P1 | Token 预算控制 | 全局 | US-08 |
| P2 | Shell 执行 + 沙箱 + 权限开关（v0.3） | Executor | US-09 |

### 关键修正：P0 从"单Agent模拟"改为"两Agent最小协作"

MVP 不是用一个 Agent 模拟全部流程——那样用户感受不到"编排"的价值。MVP 最小编排是 **Planner + Creator 两个 Agent 的接力**：

```
用户意图 → Planner 拆解为子任务 → Creator 逐个生成内容 → 合并输出 + 假设段落
```

---

## 5. User Story 详情

### US-01：意图溯源追问

> 作为使用者，创建新任务时系统追问"这个目标服务于谁？"，帮我在执行前审视意图。

**场景 1.1：正常创建**

```
Given 用户在意图规格书页面
When 填写目标/背景/约束/成功标准，点击提交
Then 跳转到溯源追问步骤
And 显示三个问题（前二必填，第三可选）
And 跳过按钮文本："跳过（我确认不需要追问）"
```

**场景 1.2：跳过追问**

```
Given 在溯源追问步骤
When 点击跳过
Then 记录跳过事件（供后续代偿审计）
And 任务正常进入 Agent 编排
```

---

### US-02：价值观显性化

> 作为使用者，系统帮我看见"我默认追求什么"，例如"快速=好？"——因为有时我自己都没意识到。

**场景 2.1：系统推断 + 用户确认**

```
Given 完成意图规格书和溯源追问
When 系统解析目标描述
Then 推断隐含价值观，如：
    "快速=好" → [同意] [我优先准确性]
    "全面=好" → [同意] [我优先聚焦]
And 默认选中"同意"，用户可修改
```

**场景 2.2：价值观影响 Agent 行为**

```
Given 用户将"快速=好"改为"我优先准确性"
When Planner Agent 拆解任务
Then 在 system prompt 中附加 {"value_overrides": {"speed": "accuracy"}}
And Planner 拆解时优先考虑准确性而非速度
```

---

### US-03：多 Agent 协作执行（核心）

> 作为使用者，我提交意图后，Planner 拆解任务，Creator 逐个生成内容——两个 Agent 接力完成我的工作，整个过程透明可见。

**场景 3.1：两 Agent 接力**

```
Given 用户完成意图 + 溯源 + 价值观，点击"开始执行"
When 编排引擎启动
Then 流程如下：
    Step 1: Planner Agent 调用 DeepSeek
            输入：{constitution, intent, trace, values}
            输出：子任务列表 + 拆解依据
            宪法过滤器检查：是否包含假设段落？是否提供替代方案？
    Step 2: Creator Agent 调用 DeepSeek（对每个子任务）
            输入：{constitution, sub_task, research_context}
            输出：内容初稿 + "我的假设"
    Step 3: 合并输出，展示给用户
And 整个过程以流式文字展示，每个 Agent 的输出可单独查看
```

**场景 3.2：执行完成**

```
Given 所有 Agent 执行完毕
When 用户查看结果
Then 展示：
    - Planner 的子任务拆解树
    - Creator 生成的内容
    - 每个 Agent 末尾的"我的假设"段落
    - "反驳假设"交互按钮
```

---

### US-04："我自己做这一步"开关

> 作为使用者，在 Agent 协作的任何环节，我都可以关掉 AI，自己完成——不是为了比 AI 更好，而是为了保持参与。

**场景 4.1：介入 Agent 步骤**

```
Given 在编排执行视图中
When 用户点击子任务 X 旁边的"自己做"开关
Then 该子任务的 Creator 调用被跳过
And 切换为编辑器模式，预填 Planner 的拆解引导
And 用户自由编辑内容，完成后继续编排
```

---

### US-05：AI 输出"我假设了什么"

> 作为使用者，每个 Agent 的输出末尾都自动附带"我的假设"段落——让我看见 AI 的前提判断。

**场景 5.1：查看 + 反驳**

```
Given Agent 完成输出
When 用户查看末尾
Then 自动展示：
    "我假设你更关心 [速度/准确性] → [不对，我优先 ___]"
    "我假设目标受众是 [___] → [不对，实际是 ___]"
And 点击"不对"后附带修正，Agent 基于新前提重生成
```

---

### US-06：暂停—反思模式

> 作为使用者，系统中有一块不被优化的空白空间——我可以不带着任何任务目标来。

**场景 6.1：进入反思**

```
Given 用户在任何页面
When 点击导航栏"暂停—反思"
Then 进入极简页面：
    - 标题："你最近在用这个系统做什么？这些事值得做吗？"
    - 文本框（无字数限制）
    - 保存按钮（仅存本地 localStorage，不进入飞轮）
And 没有进度条、没有 Agent、没有优化目标
```

---

### US-07：宪法守护进程（基础版）

> 作为使用者，系统有一个独立的守护进程——确保我没有在不知情的情况下被当作优化对象。

**借鉴 Codex execpolicy 的规则引擎设计**：

每条宪法规则定义为：

```javascript
{
  type: 'dignity',      // 宪法类型
  condition: fn,         // 触发条件
  decision: 'block',     // block | warn | allow
  justification: str,    // 拦截原因
  remedy: fn             // 修复建议
}
```

**场景 7.1：尊严红线触发**

```
Given Agent 输出中未声明"这是 AI 生成的"
When Guardian 检测到此条件
Then 阻断输出
And 推送尊严提醒：
    "系统检测到 AI 输出未声明身份 → 已自动追加声明 → 这是尊严宪法的要求"
```

---

### US-08：Token 预算控制

> 借鉴 Codex AGENTS.md 的 context management 规则，确保每次 Agent 调用的 system prompt 在可控范围内。

| 上下文组件 | 最大 token | 说明 |
|-----------|:--------:|------|
| 三条宪法文本 | 300 | 尊严 + 自主 + 追问 |
| Agent 角色定义 | 200 | Planner/Creator 各自的 role prompt |
| 意图规格书 | 800 | 目标 + 背景 + 约束 + 成功标准 |
| 溯源追问结果 | 200 | 三个问题的回答 |
| 价值观映射 | 150 | 用户确认/修改后的价值观 |
| 知识库检索片段 | 500（如启用） | MVP 阶段不启用知识库 |
| **总计** | **~2150** | 含 15% buffer |

---

### US-09：Shell 执行 + 沙箱 + 权限开关（v0.3）

> 作为使用者，当任务需要执行 shell 命令（数据分析、文件处理）时，Agent 在沙箱中替我执行——每个命令必须经过我确认 + 宪法过滤。

**设计原则**：借鉴 Codex `execpolicy` 三态决策（`allow / prompt / forbidden`），叩鸣实行**四级权限**。默认最保守（完全访问关闭 + 所有命令需确认），信任度越高可逐级开放。

**四级权限模型**：

| 级别 | 名称 | 效果 | 适用命令 |
|:--:|------|------|---------|
| 4 | **完全访问** | 无需确认，自动执行 | 用户明确信任的命令（需手动将命令加入白名单） |
| 3 | 询问确认 | 弹窗展示，用户确认后执行 | 默认级别，适用于大多数命令 |
| 2 | 加强提示 | 弹窗 + 风险警告，确认后执行 | git/mv/cp 等修改操作 |
| 1 | 永久禁止 | 宪法拦截，不可绕过 | rm/sudo/chmod/kill 等破坏性命令 |

**场景 9.1：开启 shell 执行**

```
Given 用户首次使用叩鸣
When 进入设置页面
Then "Shell 执行" 开关显示为 关闭（默认）
And 说明："开启后 Agent 可替你执行 shell 命令。所有命令默认需手动确认。
           高风险命令（rm/sudo/curl|sh）永久禁止。"
```

**场景 9.2：Agent 提议执行 + 用户确认**

```
Given Shell 开关已开启
And Creator 判断"分析 data.csv 需先统计行数"
When Agent 请求 Executor
Then 弹窗展示：
    "Executor 提议执行：$ wc -l data.csv"
    "目的：统计行数  风险：低（只读）"
    "[确认执行] [拒绝] [沙箱预览]"
And 用户确认后，命令在沙箱中运行
And 输出返回 Creator，继续编排
```

**场景 9.3：高风险命令被宪法拦截**

```
Given Shell 已开启
When Agent 提议 rm -rf ./temp
Then 宪法过滤器直接阻断（不展示确认弹窗）
And 显示："此命令已被宪法阻止。原因：破坏性操作。建议：请手动在终端执行。"
```

**场景 9.4：沙箱隔离**

```
Given 用户确认执行
When 命令运行
Then 隔离规则：
    - 文件系统：仅当前项目目录（完全访问模式下可扩展）
    - 网络：默认禁止出站（完全访问模式下可放开）
    - 进程：不允许子进程
    - 超时：30秒
```

**场景 9.5：开启完全访问模式（信任模式）**

```
Given 用户熟悉系统后，对特定命令充分信任
When 用户在沙箱设置中开启"完全访问"
Then 系统显示警告：
    "完全访问模式下，白名单中的命令将自动执行，不再逐条确认。
    这不是关闭沙箱——命令仍在隔离环境中执行。
    破坏性命令（rm/sudo/chmod/kill）永远不会自动执行。"
And 用户可在白名单中添加受信任命令：
    "cat, head, tail, wc, grep, ls, find → 自动执行"
    "python, node → 自动执行"
    "git status, git diff → 自动执行"
    "git push, git commit → 仍需确认（修改操作）"
And 完全访问模式的命令日志会额外标记 [auto]，供审计
```

**Shell 权限策略（借鉴 execpolicy）**：

| 命令 | 默认决策 | 完全访问后 | 风险 |
|------|:---:|:---:|:--:|
| cat/head/tail/wc/grep/ls/find | prompt | **allow（自动执行）** | 低 |
| python/node/Rscript/jq | prompt | **allow（自动执行）** | 中 |
| git status/diff/log | prompt | **allow（自动执行）** | 低 |
| git commit/push/add | prompt+警告 | prompt+警告 | 中 |
| mkdir/cp/mv | prompt+警告 | prompt+警告 | 中 |
| curl/wget | prompt+URL展示 | prompt+URL展示 | 中 |
| rm/sudo/chmod/kill | **forbidden** | **forbidden（永禁）** | 高 |
| 未列入规则 | 默认 forbidden | 默认 forbidden | — |

**用户沙箱权限开关**：

| 开关 | 默认 | 说明 |
|------|:---:|------|
| Shell 执行总开关 | 关 | 完全禁用 Executor |
| 完全访问（信任模式） | 关 | 开启后白名单命令自动执行，不再逐条确认 |
| 命令白名单 | 空 | 用户手动添加受信任命令（如 cat/ls/python） |
| 文件系统范围 | 仅项目目录 | 完全访问时可扩展到用户目录 |
| 网络出站 | 禁 | 允许后 curl/wget 可用 |
| 命令超时 | 30秒 | 可调至 5-120 秒 |
| 高风险命令 | 永禁 | 不受任何开关控制（宪法级，rm/sudo 等无论如何不可自动执行） |

---

## 6. MVP 排除清单

| 排除项 | 原因 | 计划 |
|--------|------|:--:|
| Shell 执行 + 沙箱 + Executor Agent | 需 v0.3 Electron 原生 child_process | v0.3 |
| 完整装配线（Researcher + Reviewer Agent） | MVP 用 Planner + Creator 两 Agent | v0.2 |
| 知识库 RAG | 依赖基础设施 | v0.2 |
| 创作透明度模式（可视化 Agent 思考链） | UI 工作量大 | v0.2 |
| 代偿审计面板 | 需用户行为数据积累 | v0.3 |
| 减速点机制 | 早期体验有负面影响 | v0.3 |
| 多用户协作 | 不在 MVP 范围 | v1.0 |
| Electron 打包分发 | MVP Web 快速迭代 | v0.3 |
| 微信登录/支付/激活码 | MVP 无需后端 | v0.2 |
| 并行 Agent 执行 | MVP 串行两 Agent，保证可靠性 | v0.2 |

---

## 7. 成功指标

| 指标 | 目标值 |
|------|--------|
| 用户完成一次"意图→Planner拆解→Creator生成→审视假设"完整闭环 | ≥5人（2周内） |
| 溯源追问跳过率 | ≤50% |
| "自己做这一步"使用率 | ≥10%的任务 |
| 假设反驳率（至少一条） | ≥15%的输出 |
| 暂停反思模式打开率 | ≥5%用户 |

---

## 8. 开发计划

| Wave | 内容 |
|:----:|------|
| 1 (Day 1-3) | 项目骨架 + 宪法编码 + 暂停反思 + 守护进程 |
| 2 (Day 4-10) | 意图规格书 + 溯源追问 + 价值观 + 两Agent编排 + "自己做"开关 + 假设段落 |
| 3 (Day 11-18) | 完整多Agent装配线 + 知识库 + Reviewer + 验证层 |
| 4 (Day 19-25) | 代偿审计 + 价值侵蚀完整版 + 减速点 |

---

*叩鸣：叩问以鸣之——追问然后让答案发出声音。*
