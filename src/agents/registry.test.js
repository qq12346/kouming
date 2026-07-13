import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

/**
 * RED phase — 测试 Agent Registry 的行为
 */

describe('Agent Registry', () => {
  let registry;

  beforeAll(async () => {
    registry = (await import('./registry')).registry;
  });

  beforeEach(async () => {
    registry.clear();
  });

  it('注册 Agent 后可通过名称获取', () => {
    registry.register({
      name: 'planner',
      role: 'planner',
      description: '任务拆解 Agent',
      requiresConstitution: true,
    });

    const agent = registry.get('planner');
    expect(agent).toBeDefined();
    expect(agent.name).toBe('planner');
    expect(agent.role).toBe('planner');
  });

  it('列出所有已注册 Agent', () => {
    registry.register({ name: 'planner', role: 'planner', requiresConstitution: true });
    registry.register({ name: 'creator', role: 'creator', requiresConstitution: true });

    const all = registry.list();
    expect(all).toHaveLength(2);
  });

  it('获取不存在的 Agent 抛出错误', () => {
    expect(() => registry.get('nonexistent')).toThrow();
  });

  it('注册同名 Agent 抛出错误', () => {
    registry.register({ name: 'planner', role: 'planner', requiresConstitution: true });
    expect(() =>
      registry.register({ name: 'planner', role: 'planner', requiresConstitution: true }),
    ).toThrow();
  });

  it('清空注册表', () => {
    registry.register({ name: 'planner', role: 'planner', requiresConstitution: true });
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });
});
