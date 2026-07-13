import { describe, it, expect, vi, beforeAll } from 'vitest';

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('@ai-sdk/deepseek', () => ({
  createDeepSeek: () => () => 'deepseek-chat',
}));

describe('Creator Agent', () => {
  let runCreator;

  beforeAll(async () => {
    runCreator = (await import('./creator')).runCreator;
  });

  it('自动提取假设段落', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '这是生成的内容。\n\n---\n我的假设：\n1. 假设用户偏好准确\n2. 假设受众是决策者',
    });

    const result = await runCreator({
      apiKey: 'test-key',
      intent: { goal: '写报告' },
      trace: { skipped: true },
      values: {},
      subtask: { id: 1, title: '生成', goal: '生成内容' },
    });

    expect(result.content).toContain('这是生成的内容');
    expect(result.assumptions).toContain('我的假设');
    expect(result.content).not.toContain('我的假设');
    expect(result.constitution).toBeDefined();
  });

  it('缺少 API Key 时抛出错误', async () => {
    await expect(
      runCreator({ apiKey: null, intent: { goal: 'test' }, trace: { skipped: true }, values: {}, subtask: { id: 1, title: 't', goal: 'g' } }),
    ).rejects.toThrow('API Key');
  });

  it('缺少子任务时抛出错误', async () => {
    await expect(
      runCreator({ apiKey: 'test-key', intent: { goal: 'test' }, trace: { skipped: true }, values: {}, subtask: null }),
    ).rejects.toThrow('子任务');
  });

  it('注入 knowledgeContext 不报错且返回完整结果', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '基于调研生成的内容' });

    const result = await runCreator({
      apiKey: 'test-key',
      intent: { goal: 'test' },
      trace: { skipped: true },
      values: {},
      subtask: { id: 1, title: 't', goal: 'g' },
      knowledgeContext: '调研结果：[一手] 市场增长率 15%',
    });

    expect(result.content).toBeDefined();
    expect(result.constitution).toBeDefined();
  });
});
