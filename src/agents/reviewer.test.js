import { describe, it, expect, vi, beforeAll } from 'vitest';

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('@ai-sdk/deepseek', () => ({
  createDeepSeek: () => () => 'deepseek-chat',
}));

describe('Reviewer Agent', () => {
  let runReviewer;

  beforeAll(async () => {
    runReviewer = (await import('./reviewer')).runReviewer;
  });

  it('正确解析 JSON 审查结果', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '{"scores":{"accuracy":4,"logic":5,"intentMatch":3},"issues":["第三节数据无来源"],"suggestions":["补充数据引用"],"overall":4,"verdict":"revise"}',
    });

    const result = await runReviewer({
      apiKey: 'test-key',
      content: '测试内容...',
      intent: { goal: '分析市场' },
    });

    expect(result.scores.accuracy).toBe(4);
    expect(result.overall).toBe(4);
    expect(result.verdict).toBe('revise');
    expect(result.issues).toContain('第三节数据无来源');
  });

  it('缺少 API Key 时抛出错误', async () => {
    await expect(
      runReviewer({ apiKey: null, content: 'test' }),
    ).rejects.toThrow('API Key');
  });

  it('缺少审查内容时抛出错误', async () => {
    await expect(
      runReviewer({ apiKey: 'test-key', content: '' }),
    ).rejects.toThrow('审查内容');
  });

  it('strictMode 开启时包含额外检查项', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '{"scores":{"accuracy":3,"logic":3,"intentMatch":3,"fallacyCheck":5,"biasCheck":5},"overall":4,"verdict":"pass"}',
    });

    const result = await runReviewer({ apiKey: 'test-key', content: 'test', strictMode: true });

    expect(result.strictMode).toBe(true);
    expect(result.scores.fallacyCheck).toBe(5);
    expect(result.scores.biasCheck).toBe(5);
  });

  it('JSON 无法解析时返回保守默认值', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '审查完毕，内容基本合格' });

    const result = await runReviewer({ apiKey: 'test-key', content: 'test' });

    expect(result.scores.accuracy).toBe(3);
    expect(result.verdict).toBe('revise');
  });
});
