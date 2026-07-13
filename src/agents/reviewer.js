/**
 * 叩鸣·工坊 — Reviewer Agent
 *
 * 质量审查 Agent。审查 Creator 或其他 Agent 的输出。
 * 根据不舒服模式调整审查严格度——默认检查事实和逻辑，不舒服模式额外检查逻辑谬误和确认偏误。
 *
 * 宪法对齐：不舒服模式默认关闭（老板决定 2026-07-12），用户手动开启后严格度提升。
 */

import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { filter } from '../constitution';

const REVIEWER_PROMPT_BASE = `你是叩鸣·工坊的 Reviewer Agent。你的任务是审查以下内容的质量。

请检查：
1. 事实准确率：内容中的事实陈述是否有明显错误？
2. 逻辑完整性：论证链条是否完整？有无跳跃？
3. 与原始意图的匹配度：是否回应了用户的意图？`;

const REVIEWER_PROMPT_STRICT = `
4. 逻辑谬误：是否存在稻草人论证、滑坡谬误、虚假两难等？
5. 确认偏误：是否只呈现了支持某一观点的证据？
6. 替代视角：是否有未被考虑的视角？`;

const REVIEWER_PROMPT_SUFFIX = `

输出格式（JSON）：
{
  "scores": {
    "accuracy": 1-5,
    "logic": 1-5,
    "intentMatch": 1-5,
    "fallacyCheck": 1-5,
    "biasCheck": 1-5
  },
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "overall": 1-5,
  "verdict": "pass" | "revise" | "reject"
}`;

export async function runReviewer({ apiKey, content, intent, strictMode = false }) {
  if (!apiKey) throw new Error('Reviewer: API Key 未配置');
  if (!content) throw new Error('Reviewer: 缺少审查内容');

  const deepseek = createDeepSeek({ apiKey });

  let systemPrompt = REVIEWER_PROMPT_BASE;
  if (strictMode) {
    systemPrompt += REVIEWER_PROMPT_STRICT;
  }
  systemPrompt += REVIEWER_PROMPT_SUFFIX;

  const userPrompt = `请审查以下内容：\n\n意图：${intent?.goal || '未指定'}\n\n内容：\n${content.slice(0, 4000)}`;

  let rawText = '';
  try {
    const result = await generateText({
      model: deepseek('deepseek-chat'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    });
    rawText = result.text;
  } catch (e) {
    throw new Error(`Reviewer: DeepSeek 调用失败 — ${e.message}`);
  }

  let parsed;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // 解析失败时返回保守结果
  }

  const constitution = filter(rawText);

  return {
    scores: parsed?.scores || { accuracy: 3, logic: 3, intentMatch: 3 },
    issues: parsed?.issues || [],
    suggestions: parsed?.suggestions || [],
    overall: parsed?.overall || 3,
    verdict: parsed?.verdict || 'revise',
    strictMode,
    constitution,
  };
}
