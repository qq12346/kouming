import { create } from 'zustand';

/**
 * 守护进程状态 Store
 *
 * 记录五项监控的告警历史。
 * UI 读取此 store 显示守护进程的实时反馈。
 */
export const useGuardianStore = create((set, get) => ({
  /** 告警列表（最新的在前） */
  alerts: [],

  /** 添加一条告警 */
  addAlert: (alert) =>
    set((s) => ({
      alerts: [{ ...alert, id: Date.now(), time: new Date().toISOString() }, ...s.alerts].slice(0, 50),
    })),

  /** 清除所有告警 */
  clearAlerts: () => set({ alerts: [] }),
}));
