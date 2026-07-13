import { describe, it, expect, vi, beforeAll } from 'vitest';

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('@ai-sdk/deepseek', () => ({
  createDeepSeek: () => () => 'deepseek-chat',
}));

describe('Planner Agent', () => {
  let runPlanner;

  beforeAll(async () => {
    runPlanner = (await import('./planner')).runPlanner;
  });

  it('正确解析合法的 JSON 响应', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '```json\n{"subtasks":[{"id":1,"title":"分析市场","goal":"收集数据","dependsOn":[]}],"reasoning":"需要先收集数据"}\n```',
    });

    const result = await runPlanner({
      apiKey: 'test-key',
      intent: { goal: '分析市场' },
      trace: { skipped: true },
      values: { speed: 'speed', coverage: 'coverage', novelty: 'novelty' },
    });

    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks[0].title).toBe('分析市场');
    expect(result.reasoning).toBe('需要先收集数据');
    expect(result.constitution).toBeDefined();
  });

  it('缺少 API Key 时抛出错误', async () => {
    await expect(
      runPlanner({ apiKey: null, intent: { goal: 'test' }, trace: { skipped: true }, values: {} }),
    ).rejects.toThrow('API Key');
  });

  it('JSON 格式错误时抛出可读错误', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '这不是 JSON' });

    await expect(
      runPlanner({ apiKey: 'test-key', intent: { goal: 'test' }, trace: { skipped: true }, values: {} }),
    ).rejects.toThrow('无法解析');
  });

  it('缺少 subtasks 字段时抛出错误', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '{"reasoning": "没有子任务"}' });

    await expect(
      runPlanner({ apiKey: 'test-key', intent: { goal: 'test' }, trace: { skipped: true }, values: {} }),
    ).rejects.toThrow('subtasks');
  });
});
