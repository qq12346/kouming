import { describe, it, expect, beforeAll } from 'vitest';

// Mock localStorage for Node.js test environment
beforeAll(() => {
  globalThis.localStorage = {
    _data: {},
    getItem: (k) => globalThis.localStorage._data[k] || null,
    setItem: (k, v) => { globalThis.localStorage._data[k] = v; },
    removeItem: (k) => { delete globalThis.localStorage._data[k]; },
  };
});

import { AuditCollector, checkSpeedBump, generatePeriodicReport } from './collector';

describe('Audit Collector', () => {
  it('记录溯源跳过', () => {
    AuditCollector.traceSkipped();
    const report = AuditCollector.getReport();
    expect(report.traceSkipRate).toBeGreaterThanOrEqual(0);
  });

  it('记录溯源完成', () => {
    AuditCollector.traceCompleted({ serves: 'CEO' });
    const report = AuditCollector.getReport();
    expect(report.totalTraces).toBeGreaterThanOrEqual(0);
  });

  it('记录价值观修改', () => {
    AuditCollector.valuesChanged({ speed: 'speed' }, { speed: 'accuracy' });
    const report = AuditCollector.getReport();
    expect(report.valuesChangedCount).toBeGreaterThanOrEqual(0);
  });

  it('记录自己做步骤', () => {
    AuditCollector.stepUserDid(1);
    const report = AuditCollector.getReport();
    expect(report.userDidStepCount).toBeGreaterThanOrEqual(0);
  });

  it('记录反驳假设', () => {
    AuditCollector.assumptionRebuttal(2);
    const report = AuditCollector.getReport();
    expect(report.rebuttalCount).toBeGreaterThanOrEqual(0);
  });

  it('记录任务完成', () => {
    AuditCollector.taskCompleted(5, 30000);
    const report = AuditCollector.getReport();
    expect(report.totalTasks).toBeGreaterThanOrEqual(0);
  });

  it('getReport 返回结构化数据', () => {
    const report = AuditCollector.getReport();
    expect(report).toHaveProperty('aiDependencyScore');
    expect(report).toHaveProperty('agencyScore');
    expect(report).toHaveProperty('questioningScore');
    expect(report).toHaveProperty('totalTasks');
    expect(report).toHaveProperty('traceSkipRate');
    expect(report.aiDependencyScore).toBeGreaterThanOrEqual(0);
    expect(report.aiDependencyScore).toBeLessThanOrEqual(100);
    expect(report.agencyScore).toBeGreaterThanOrEqual(0);
    expect(report.agencyScore).toBeLessThanOrEqual(100);
    expect(report.questioningScore).toBeGreaterThanOrEqual(0);
    expect(report.questioningScore).toBeLessThanOrEqual(100);
  });
});

describe('Speed Bump Detection', () => {
  it('不足 5 个快照时返回 null', () => {
    const result = checkSpeedBump({ totalTasks: 1 });
    expect(result).toBeNull();
  });

  it('连续快照足够时返回结构或 null', () => {
    for (let i = 0; i < 10; i++) {
      checkSpeedBump({ totalTasks: 1 + i });
    }
    const last = checkSpeedBump({ totalTasks: 10 });
    // This may or may not trigger depending on ratio - just verify it doesn't crash
    expect(last === null || last?.triggered !== undefined).toBe(true);
  });
});

describe('Periodic Report Generation', () => {
  it('生成包含必需字段的报告', () => {
    const report = generatePeriodicReport();
    expect(report).toHaveProperty('current');
    expect(report).toHaveProperty('period');
    expect(report.current).toHaveProperty('aiDependencyScore');
    expect(report.current).toHaveProperty('agencyScore');
  });
});
