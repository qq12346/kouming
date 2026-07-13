import { describe, it, expect } from 'vitest';
import { filter, passes } from './index';
import { DIGNITY_RULE, AUTONOMY_RULE, QUESTIONING_RULE } from './rules';

describe('尊严宪法 (Dignity)', () => {
  const rule = DIGNITY_RULE;

  it('缺少 AI 声明的文本 → 触发 block', () => {
    for (const text of rule.test_cases.match) {
      expect(rule.condition(text)).toBe(true);
      const result = filter(text);
      expect(result.status).toBe('block');
      expect(result.violations.some((v) => v.rule === 'dignity')).toBe(true);
    }
  });

  it('含 AI 声明标��的文本 → 不触发', () => {
    for (const text of rule.test_cases.not_match) {
      expect(rule.condition(text)).toBe(false);
    }
  });

  it('block 后自动追加身份声明', () => {
    const input = '纯文本内容';
    const result = filter(input);
    expect(result.remediedOutput).toContain('[叩鸣·工坊 AI 参与]');
    expect(result.remediedOutput).toContain('纯文本内容');
    expect(result.originalOutput).toBe(input);
  });
});

describe('自主宪法 (Autonomy)', () => {
  const rule = AUTONOMY_RULE;

  it('不含替代方案的文本 → 触发 warn', () => {
    for (const text of rule.test_cases.match) {
      expect(rule.condition(text)).toBe(true);
      const result = filter(text);
      expect(result.violations.some((v) => v.rule === 'autonomy')).toBe(true);
    }
  });

  it('包含 2 个替代方案的文本 → 不触发', () => {
    for (const text of rule.test_cases.not_match) {
      expect(rule.condition(text)).toBe(false);
    }
  });

  it('warn 后自动追加替代方案提示', () => {
    const input = 'AI 生成：单一方案输出。';
    const result = filter(input);
    expect(result.remediedOutput).toContain('替代方案：');
    expect(result.violations).toHaveLength(2); // autonomy + questioning (dignity passes)
  });
});

describe('追问宪法 (Questioning)', () => {
  const rule = QUESTIONING_RULE;

  it('不含假设段落的文本 → 触发 warn', () => {
    for (const text of rule.test_cases.match) {
      expect(rule.condition(text)).toBe(true);
    }
  });

  it('含假设段落的文本 → 不触发', () => {
    for (const text of rule.test_cases.not_match) {
      expect(rule.condition(text)).toBe(false);
    }
  });

  it('warn 后自动追加假设段落', () => {
    const input = '不含假设的输出。';
    const result = filter(input);
    expect(result.remediedOutput).toContain('我的假设');
  });
});

describe('决策逻辑', () => {
  it('任一 block → 整体 status=block', () => {
    const result = filter('无声明、无替代、无假设');
    expect(result.status).toBe('block');
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });

  it('全部通过 → status=pass', () => {
    const result = filter('AI 生成\n替代方案A。\n替代方案B。\n我的假设：1.假设X');
    expect(result.status).toBe('pass');
    expect(result.violations).toHaveLength(0);
  });

  it('passes() 便捷方法正常', () => {
    expect(passes('无身份声明')).toBe(false);
    expect(passes('AI 生成\n替代方案A。替代方案B。\n我的假设：1.X')).toBe(true);
  });
});
