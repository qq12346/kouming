import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Agent 执行状态 Store
 *
 * 编排引擎写入此 store。守护进程通过 subscribeWithSelector 只读订阅 agentOutputs。
 *
 * 架构约束（借鉴 Codex 的利益冲突隔离）：
 * - 守护进程只订阅不写入
 * - 编排引擎写入不感知守护进程
 * - 两者通过独立的 store 中间件解耦
 */
export const useAgentStore = create(
  subscribeWithSelector((set, get) => ({
    /** Agent 输出列表（按时间顺序追加） */
    agentOutputs: [],

    /** 追加一条 Agent 输出 */
    appendOutput: (output) =>
      set((s) => ({
        agentOutputs: [...s.agentOutputs, output],
      })),

    /** 当前执行步骤 */
    currentStep: 0,

    /** 设置当前步骤 */
    setCurrentStep: (step) => set({ currentStep: step }),

    /** 总步骤数 */
    totalSteps: 0,

    /** 设置总步骤数 */
    setTotalSteps: (n) => set({ totalSteps: n }),

    /** 执行状态 */
    status: 'idle', // 'idle' | 'running' | 'completed' | 'error'

    /** 设置状态 */
    setStatus: (status) => set({ status }),

    /** 错误信息 */
    error: null,

    setError: (error) => set({ error, status: 'error' }),

    /** 重置执行状态 */
    reset: () =>
      set({
        agentOutputs: [],
        currentStep: 0,
        totalSteps: 0,
        status: 'idle',
        error: null,
      }),
  })),
);
