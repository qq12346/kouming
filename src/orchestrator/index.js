/**
 * 叩鸣·工坊 — 编排引擎（4-Agent 完整版）
 *
 * 多 Agent 编排的核心调度器。
 * 负责：Planner 拆解 → [Researcher 调研] → Creator 生成 → [Reviewer 审查]
 * 每个 Agent 输出经过宪法过滤器。状态写入 Zustand agentStore。
 */

import { runPlanner } from '../agents/planner';
import { runResearcher } from '../agents/researcher';
import { runCreator } from '../agents/creator';
import { runReviewer } from '../agents/reviewer';
import { KnowledgeBase } from '../knowledge/manager';
import { useAgentStore } from '../store/agentStore';
import { useUserStore } from '../store/userStore';
import { initGuardian } from '../guardian';

let guardianUnsub = null;

/**
 * 启动编排流水线
 *
 * @param {object} deps
 * @param {string} deps.apiKey
 * @param {object} deps.intent
 * @param {object} deps.trace
 * @param {object} deps.values
 * @param {object} deps.options
 * @returns {Promise<object>}
 */
export async function orchestrate({ apiKey, intent, trace, values, options = {} }) {
  const store = useAgentStore.getState();
  store.reset();
  store.setStatus('running');

  if (!guardianUnsub) {
    guardianUnsub = initGuardian(useAgentStore);
  }

  try {
    // Step 1: Planner
    store.setCurrentStep(1);
    const plan = await runPlanner({ apiKey, intent, trace, values });
    store.appendOutput({
      agent: 'planner',
      output: plan.rawText,
      filtered: plan.constitution.status !== 'pass',
      constitution: plan.constitution.status,
    });

    // 计算总步数
    const withResearch = options.withResearch !== false;
    const withReview = options.withReview !== false;
    let stepCount = 1; // planner
    if (withResearch) stepCount += plan.subtasks.length;
    stepCount += plan.subtasks.length; // creator
    if (withReview) stepCount += 1; // reviewer
    store.setTotalSteps(stepCount);

    // Step 2: Researcher (optional, per sub-task)
    let currentStep = 1;
    const researchResults = [];

    if (withResearch) {
      for (const subtask of plan.subtasks) {
        if (options.skipSteps?.includes(subtask.id)) continue;
        currentStep++;
        store.setCurrentStep(currentStep);

        // 搜索知识库获取上下文
        const kbContext = await KnowledgeBase.getContext(
          `${subtask.title} ${subtask.goal} ${intent.goal}`,
        );

        const research = await runResearcher({
          apiKey, intent, trace, values, subtask,
          plannerReasoning: plan.reasoning,
          knowledgeContext: kbContext,
        });
        researchResults.push({ subtaskId: subtask.id, ...research });

        store.appendOutput({
          agent: 'researcher',
          output: research.rawText,
          filtered: research.constitution.status !== 'pass',
          constitution: research.constitution.status,
          subtaskId: subtask.id,
        });
      }
    }

    // Step 3: Creator (per sub-task)
    const creatorResults = [];
    for (const subtask of plan.subtasks) {
      currentStep++;
      store.setCurrentStep(currentStep);

      let creatorOutput;
      const subResearch = researchResults.find((r) => r.subtaskId === subtask.id);
      if (options.skipSteps?.includes(subtask.id)) {
        creatorOutput = {
          content: '', assumptions: '',
          constitution: { status: 'pass', violations: [] },
          rawText: '', skipped: true,
        };
      } else {
        // Find research + KB context for this sub-task
        const subResearch = researchResults.find((r) => r.subtaskId === subtask.id);
        const kbContext = await KnowledgeBase.getContext(
          `${subtask.title} ${subtask.goal}`,
        );
        const combinedContext = [subResearch?.content, kbContext].filter(Boolean).join('\n\n');

        creatorOutput = await runCreator({
          apiKey, intent, trace, values, subtask,
          plannerReasoning: plan.reasoning,
          knowledgeContext: combinedContext,
        });

        store.appendOutput({
          agent: 'creator',
          output: creatorOutput.rawText,
          filtered: creatorOutput.constitution.status !== 'pass',
          constitution: creatorOutput.constitution.status,
          subtaskId: subtask.id,
        });
      }

      creatorResults.push({ subtask, research: subResearch, ...creatorOutput });
    }

    // Step 4: Reviewer (overall review)
    let reviewResult = null;
    if (withReview) {
      currentStep++;
      store.setCurrentStep(currentStep);

      const combinedContent = creatorResults
        .filter((r) => !r.skipped)
        .map((r) => r.content)
        .join('\n\n---\n\n');

      const strictMode = useUserStore.getState().uncomfortableMode;
      reviewResult = await runReviewer({
        apiKey, content: combinedContent, intent, strictMode,
      });

      store.appendOutput({
        agent: 'reviewer',
        output: JSON.stringify(reviewResult),
        filtered: reviewResult.constitution?.status !== 'pass',
        constitution: reviewResult.constitution?.status || 'pass',
      });
    }

    store.setStatus('completed');
    store.setCurrentStep(stepCount);

    return {
      plan,
      researchResults,
      creatorResults,
      review: reviewResult,
      totalSteps: stepCount,
      status: 'completed',
    };
  } catch (e) {
    store.setError(e.message);
    throw e;
  }
}

export function shutdown() {
  if (guardianUnsub) { guardianUnsub(); guardianUnsub = null; }
}
