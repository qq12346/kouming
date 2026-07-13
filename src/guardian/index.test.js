import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initGuardian, GuardianEvents } from './index';

// 创建一个最小化的 Zustand-like store 用于测试
function createTestStore(initialState = { agentOutputs: [] }) {
  const listeners = new Set();
  let state = { ...initialState };

  return {
    getState: () => state,
    setState: (update) => {
      const next = typeof update === 'function' ? update(state) : update;
      state = next;
      listeners.forEach((fn) => fn(next));
    },
    subscribe: (listener) => {
      // subscribeWithSelector 风格的 selector 支持
      const selector = typeof listener === 'function' ? listener : null;
      if (selector) {
        const wrappedListener = (s) => selector(s);
        listeners.add(wrappedListener);
        return () => listeners.delete(wrappedListener);
      }
      // 普通 subscribe：传入 next state
      const wrapped = (s) => listener(s, state);
      listeners.add(wrapped);
      return () => listeners.delete(wrapped);
    },
    appendOutput: (output) => {
      const prev = state.agentOutputs;
      const next = { ...state, agentOutputs: [...prev, output] };
      state = next;
      listeners.forEach((fn) => fn(next));
    },
  };
}

describe('守护进程', () => {
  let store;
  let violations = [];

  beforeEach(() => {
    store = createTestStore();
    violations = [];
    GuardianEvents.addEventListener('guardian:violation', (e) => {
      violations.push(e.detail);
    });
  });

  it('检测尊严违反：Agent 输出缺少 AI 身份声明', () => {
    initGuardian(store);

    store.appendOutput({
      agent: 'creator',
      output: '这是没有身份声明的普通文本输出。',
      filtered: false,
      constitution: null,
    });

    // 等待事件触发
    expect(violations.length).toBeGreaterThanOrEqual(1);
    const violation = violations[0];
    expect(violation.agent).toBe('creator');
    expect(violation.violations.some((v) => v.rule === 'dignity')).toBe(true);
  });

  it('检测自主违反：输出缺少替代方案', () => {
    initGuardian(store);

    store.appendOutput({
      agent: 'creator',
      output: 'AI 生成：单一方案输出。',
      filtered: false,
    });

    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].violations.some((v) => v.rule === 'autonomy')).toBe(true);
  });

  it('检测追问违反：输出缺少假设段落', () => {
    initGuardian(store);

    store.appendOutput({
      agent: 'creator',
      output: 'AI 生成：替代方案A。\n替代方案B。\n没有假设段落。',
      filtered: false,
    });

    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].violations.some((v) => v.rule === 'questioning')).toBe(true);
  });

  it('全部通过时不触发事件', () => {
    initGuardian(store);

    store.appendOutput({
      agent: 'creator',
      output: 'AI 生成：完美的输出。\n替代方案A。\n替代方案B。\n我的假设：1. 假设X。',
      filtered: false,
    });

    expect(violations).toHaveLength(0);
  });

  it('initGuardian 在 store 不可用时安全返回', () => {
    const unsub = initGuardian(null);
    expect(typeof unsub).toBe('function');
    unsub(); // 不抛异常
  });
});
