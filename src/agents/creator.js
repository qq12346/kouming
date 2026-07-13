/**
 * 叩鸣·工坊 — Creator Agent
 *
 * 接收子任务和上下文，调用 DeepSeek API 生成内容。
 * 自动在输出末尾附加"我的假设"段落。
 * 输出必须���过宪法过滤器检查。
 */

import { generateText } from 'ai';
import { getModel } from './model';
import { buildContext } from '../context/builder';
import { filter } from '../constitution';

/**
 * 执行 Creator Agent —— 生成子任务内容
 *
 * @param {object} deps
 * @param {string} deps.apiKey - 用户的 DeepSeek API Key
 * @param {object} deps.intent - 意图规格书
 * @param {object} deps.trace - 溯源追问结果
 * @param {object} deps.values - 价值观映射
 * @param {object} deps.subtask - 当前子任务
 * @param {string} deps.plannerReasoning - Planner 的拆解依据
 * @returns {Promise<{content: string, assumptions: string, constitution: object}>}
 */
export async function runCreator({
  apiKey,
  modelProvider,
  customBaseURL,
  modelName,
  intent,
  trace,
  values,
  subtask,
  plannerReasoning,
  knowledgeContext,
}) {
  if (!apiKey) throw new Error('Creator: API Key 未配置');
  if (!subtask) throw new Error('Creator: 缺少子任务信息');

  const ctx = buildContext({
    role: 'creator',
    intent,
    trace,
    values,
    subtask,
    plannerReasoning,
  });

  // Inject Researcher/KB context into system prompt
  if (knowledgeContext) {
    ctx.messages[0].content += `\n\n[参考信息]\n${knowledgeContext}`;
  }

  let rawText = '';
  try {
    const result = await generateText({
      model: getModel({ apiKey, modelProvider, customBaseURL, modelName }),
      system: ctx.messages[0].content,
      prompt: ctx.messages[1].content,
      temperature: 0.5,
    });
    rawText = result.text;
  } catch (e) {
    throw new Error(`Creator: DeepSeek 调用失败 — ${e.message}`);
  }

  // 检查是否已包含假设段落
  let content = rawText;
  let assumptions = '';

  const assumptionMatch = rawText.match(/---\s*\n\s*我(的)?假设[\s\S]*/i);
  if (assumptionMatch) {
    assumptions = assumptionMatch[0];
    content = rawText.slice(0, assumptionMatch.index).trim();
  }

  // 剥离末尾可能残留的空白 "### 假设" 标题和重复内容
  // AI 有时会在正文后面重复输出一遍相同内容——检测头部标题是否在尾部重复出现
  const firstHeading = content.match(/^#{2,4}\s+(.+)$/m);
  if (firstHeading) {
    const headingText = firstHeading[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dupPattern = new RegExp(`#{2,4}\\s+${headingText}`, 'gi');
    let match;
    let firstIdx = -1;
    let secondIdx = -1;
    // Find first and second occurrences
    const execResults = [];
    while ((match = dupPattern.exec(content)) !== null) {
      execResults.push(match.index);
    }
    if (execResults.length >= 2) {
      // Check the second occurrence is past 60% of content - likely a duplicate
      firstIdx = execResults[0];
      secondIdx = execResults[1];
      const splitPoint = secondIdx > 0 && secondIdx > content.length * 0.6 ? secondIdx : -1;
      if (splitPoint > 0) {
        // Also remove any leading "### 假设" or "---" before the duplicate heading
        content = content.slice(0, splitPoint).replace(/[\n\r]+###\s*(我(的)?)?假设\s*[\n\r-]*$/gi, '').trim();
      }
    }
  }

  // 宪法过滤
  const constitution = filter(rawText);

  // Strip assumptions from content
  const remedyContent = constitution.remediedOutput;
  const remedyAssumptionMatch = remedyContent.match(/---\s*\n\s*我(的)?假设[\s\S]*/i);
  let cleanContent = remedyAssumptionMatch
    ? remedyContent.slice(0, remedyAssumptionMatch.index).trim()
    : remedyContent;

  // 剥离 AI 参与声明（只有匹配时才移除）
  cleanContent = cleanContent.replace(/叩鸣[·\\.]?工坊\s+AI\s*参与声明[\s\S]*?所有选择权始终属于你[。.]?\s*[-—]{2,}\s*/i, '').trim();

  return {
    content: cleanContent,
    assumptions: assumptions || (remedyAssumptionMatch ? remedyAssumptionMatch[0].trim() : extractAssumptions(remedyContent)),
    constitution,
    rawText,
  };
}

function extractAssumptions(text) {
  const match = text.match(/---[\s\S]*?我(的)?假设[\s\S]*/i);
  return match ? match[0].trim() : '';
}
