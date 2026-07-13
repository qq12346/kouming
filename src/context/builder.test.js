import { describe, it, expect, beforeAll } from 'vitest';

/**
 * RED phase — 这些测试验证 Context Builder 的行为
 */

// We import TOKEN_BUDGET and buildContext after writing implementation
// For now, define the expected interface

describe('Context Builder', () => {
  let buildContext;

  // Dynamically import after implementation
  beforeAll(async () => {
    const mod = await import('./builder');
    buildContext = mod.buildContext;
  });

  it('构建 basic system prompt — 包含宪法和 Agent 角色', () => {
    const result = buildContext({
      role: 'planner',
      intent: { goal: '分析新能源汽车市场' },
      trace: { serves: '产品团队', definedGood: '市场部门定义的准确性', skipped: false },
      values: { speed: 'accuracy', coverage: 'focus', novelty: 'feasibility' },
    });

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].role).toBe('system');
    expect(result.messages[0].content).toContain('宪法约束');
    expect(result.messages[0].content).toContain('Planner');
    expect(result.messages[1].role).toBe('user');
    expect(result.messages[1].content).toContain('分析新能源汽车市场');
  });

  it('system prompt 包含溯源追问结果', () => {
    const result = buildContext({
      role: 'creator',
      intent: { goal: '写一份竞品分析' },
      trace: { serves: 'CEO', definedGood: 'CEO 定义的"有洞察力"', skipped: false },
      values: { speed: 'speed', coverage: 'coverage', novelty: 'novelty' },
    });

    expect(result.messages[0].content).toContain('CEO');
    expect(result.messages[0].content).toContain('有洞察力');
  });

  it('system prompt 包含用户价值观映射', () => {
    const result = buildContext({
      role: 'creator',
      intent: { goal: '写总结' },
      trace: { skipped: true },
      values: { speed: 'accuracy', coverage: 'key_points', novelty: 'reliability' },
    });

    expect(result.messages[0].content).toContain('准确');
    expect(result.messages[0].content).toContain('关键点');
    expect(result.messages[0].content).toContain('可靠');
  });

  it('token 预算不超限', () => {
    const result = buildContext({
      role: 'planner',
      intent: {
        goal: 'A'.repeat(2000), // 超过 intent 预算
        background: 'bg',
        constraints: 'c',
        successCriteria: 's',
      },
      trace: { skipped: true },
      values: { speed: 'speed', coverage: 'coverage', novelty: 'novelty' },
    });

    const systemText = result.messages[0].content;
    const estimatedTokens = Math.ceil(systemText.length / 2);
    // TOKEN_BUDGET total is 2300, plus buffer
    expect(estimatedTokens).toBeLessThanOrEqual(3500);
  });
});
