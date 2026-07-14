/**
 * 叩鸣·工坊 — Markdown 导出工具
 *
 * 将编排结果拼接为结构化 Markdown 文件并触发浏览器下载。
 */

/**
 * @param {object} params
 * @param {string} params.goal - 用户意图
 * @param {string} params.background - 背景
 * @param {object} params.plan - Planner 输出
 * @param {Array} params.creatorResults - Creator 各子任务结果
 * @param {object} params.review - Reviewer 输出
 * @returns {string} 完整的 Markdown 文本
 */
export function buildMarkdownExport({ goal, background, plan, creatorResults, review }) {
  const lines = [];

  lines.push(`# ${goal}`);
  lines.push('');

  if (background) {
    lines.push(`> 背景：${background}`);
    lines.push('');
  }

  lines.push(`> 本文由叩鸣·工坊生成（${new Date().toISOString().slice(0, 10)}），可直接交给编程 Agent 消费。`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Planner
  if (plan) {
    lines.push('## 任务拆解');
    lines.push('');
    if (plan.reasoning) {
      lines.push(`> ${plan.reasoning}`);
      lines.push('');
    }
    plan.subtasks?.forEach((t, i) => {
      lines.push(`### ${i + 1}. ${t.title}`);
      lines.push('');
      lines.push(`**目标**：${t.goal}`);
      if (t.dependsOn?.length) {
        lines.push(`**依赖**：${t.dependsOn.map((d) => `#${d}`).join(', ')}`);
      }
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  // Creator results
  creatorResults?.forEach((item, i) => {
    lines.push(`## ${item.subtask?.title || `子任务 ${i + 1}`}`);
    lines.push('');
    if (item.content) {
      // 块级去重：拆分为 ## 段落，去掉相邻或相隔的重复块
      const blocks = item.content.split(/(?=^#{2,3}\s)/m);
      const seen = new Set();
      const deduped = blocks.map((b) => b.trim()).filter((b) => {
        if (!b || b.length < 5) return false;
        const key = b.replace(/\s+/g, '').slice(0, 80);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      lines.push(deduped.join('\n\n'));
      lines.push('');
    }
    if (item.assumptions) {
      lines.push('### 假设');
      lines.push('');
      lines.push(item.assumptions);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  // Reviewer
  if (review) {
    lines.push('## 审查结果');
    lines.push('');
    lines.push(`- **综合评分**：${review.overall}/5`);
    if (review.strictMode) {
      lines.push(`- **模式**：严格模式`);
    }
    if (review.issues?.length) {
      lines.push('- **问题**：');
      review.issues.forEach((issue) => {
        lines.push(`  - ${issue}`);
      });
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push(`*叩鸣·工坊 | zhizhi.ink | ${new Date().toISOString().slice(0, 10)}*`);

  return lines.join('\n');
}

/** 触发浏览器下载 */
export function downloadMarkdown(markdown, goal) {
  const slug = (goal || 'export').slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
  const filename = `叩鸣-${slug}-${new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
