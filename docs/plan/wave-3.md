# Wave 3 详细计划：完整引擎

> 父文档：`plan.md` | 周期：Day 11-18 | 多 Agent 完整装配线 + 知识库 + Shell 沙箱执行

---

## 模块 M3-1：完整 Agent 装配线

### 任务 M3-1.1：Researcher Agent

| 属性 | 值 |
|------|-----|
| 输入 | M2-2.1（Context Builder）/ M2-2.2（注册表） |
| 输出 | `agents/researcher.js` |
| 验收 | 输入子任务（调研类） → DeepSeek 调用 → 返回调研结果 + 信息来源标注 |
| 宪法对齐 | 信息来源必须标注"一手/二手/未知"——波兹曼的要求 |
| 文件 | `src/agents/researcher.js` |

### 任务 M3-1.2：Reviewer Agent

| 属性 | 值 |
|------|-----|
| 输入 | M2-2 / M3-1.1 |
| 输出 | `agents/reviewer.js` |
| 验收 | 输入 Creator 输出 → 审查质量 → 返回审查意见（事实准确率/逻辑/完整性） |
| 宪法对齐 | 不舒服模式开启时，Reviewer 额外检查逻辑谬误和确认偏误 |
| 文件 | `src/agents/reviewer.js` |

### 任务 M3-1.3：完整装配线编排

| 属性 | 值 |
|------|-----|
| 输入 | M2-4.2 / M3-1.1 / M3-1.2 |
| 输出 | 编排引擎升级：`Planner → Researcher → Creator → Reviewer` 四 Agent 串联 |
| 验收 | 完整装配线跑通 | 独立子任务支持并行 Creator 调用 |

### 任务 M3-1.4：Agent 间上下文传递

| 属性 | 值 |
|------|-----|
| 输入 | M3-1.3 |
| 输出 | 上游 Agent 输出自动注入下游 Agent 的 system prompt |
| 验收 | Planner 的拆解依据体现在 Creator 的 system prompt 中 |

---

## 模块 M3-2：知识库 + RAG

### 任务 M3-2.1：知识库管理器

| 属性 | 值 |
|------|-----|
| 输入 | 无（独立模块） |
| 输出 | `knowledge/manager.js` — 上传/索引/检索 |
| 验收 | 上传 PDF/TXT/MD → 提取文本 → 分块存储 |
| 文件 | `src/knowledge/manager.js` |

### 任务 M3-2.2：本地向量嵌入 + 检索

| 属性 | 值 |
|------|-----|
| 输入 | M3-2.1 |
| 输出 | 使用本地 embedding 模型 → 向量检索 → 相关片段注入 Context |
| 验收 | 意图 "分析XX市场" → 检索到知识库中相关片段 → 注入 Researcher 的 system prompt |

### 任务 M3-2.3：知识溯源面板

| 属性 | 值 |
|------|-----|
| 输入 | M3-2.2 |
| 输出 | UI 组件：每条引用标注来源 / 时间 / 是自己上传的还是 AI 检索的 |
| 宪法对齐 | 费曼+波兹曼的要求：区分"我真正知道的"和"AI 替我找到的" |

---

## 模块 M3-3：Shell 执行 + 沙箱

### 任务 M3-3.1：Executor Agent

| 属性 | 值 |
|------|-----|
| 输入 | M2-2.2 |
| 输出 | `agents/executor.js` — 在沙箱中执行 shell 命令 |
| 验收 | 接收命令 → 沙箱执行 → 返回 stdout/stderr |
| 文件 | `src/agents/executor.js` |

### 任务 M3-3.2：Shell 权限策略引擎

| 属性 | 值 |
|------|-----|
| 输入 | M3-3.1 |
| 输出 | `constitution/shell-policy.js` — 四级权限模型 |
| 验收 | cat → allow (完全访问时) / rm → forbidden / curl → prompt |
| 文件 | `src/constitution/shell-policy.js` |

### 任务 M3-3.3：沙箱实现

| 属性 | 值 |
|------|-----|
| 输入 | M3-3.1 / M3-3.2 |
| 输出 | Node.js child_process + macOS sandbox-exec 隔离 |
| 验收 | 命令在隔离环境中运行：仅项目目录可读写 / 网络默认禁止 / 30 秒超时 |

### 任务 M3-3.4：Shell 确认 UI

| 属性 | 值 |
|------|-----|
| 输入 | M3-3.1 / M3-3.2 |
| 输出 | 命令弹窗：命令+目的+风险等级+确认/拒绝/预览 |
| 验收 | 用户可逐条确认或拒绝 | 完全访问模式下白名单命令自动执行 |

### 任务 M3-3.5：用户切换至"完全访问"模式

| 属性 | 值 |
|------|-----|
| 输入 | M3-3.2 |
| 输出 | Settings 页面：完全访问开关 + 白名单管理 |
| 验收 | 开启时显示警告 / 白名单命令自动执行 / rm 等永禁命令不受影响 |

---

## Wave 3 完成检查清单

- [ ] 四 Agent 装配线完整跑通
- [ ] Researcher 标注信息来源
- [ ] Reviewer 根据不舒服模式调整审查严格度
- [ ] 知识库可上传文档并检索
- [ ] Shell 命令可在沙箱中执行
- [ ] 四级权限模型正常运行
- [ ] 完全访问模式白名单生效
- [ ] 高风险命令（rm/sudo）被永久拦截
