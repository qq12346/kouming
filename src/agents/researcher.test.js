import { describe, it, expect, vi, beforeAll } from 'vitest';

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock('ai', () => ({ generateText: mockGenerateText }));
vi.mock('@ai-sdk/deepseek', () => ({
  createDeepSeek: () => () => 'deepseek-chat',
}));

describe('Researcher Agent', () => {
  let runResearcher;

  beforeAll(async () => {
    runResearcher = (await import('./researcher')).runResearcher;
  });

  it('正确标注信息来源类型并统计', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '## 调研结果\n\n市场增长率 15% [二手]\n\n根据公开财报 [一手]\n\n推测未来趋势 [推断]',
    });

    const result = await runResearcher({
      apiKey: 'test-key',
      intent: { goal: '分析市场' },
      trace: { skipped: true },
      values: {},
      subtask: { id: 1, title: '调研', goal: '收集信息' },
    });

    expect(result.content).toContain('调研');
    expect(result.sourceStats.primary).toBe(1);
    expect(result.sourceStats.secondary).toBe(1);
    expect(result.sourceStats.inferred).toBe(1);
    expect(result.constitution).toBeDefined();
  });

  it('缺少 API Key 时抛出错误', async () => {
    await expect(
      runResearcher({ apiKey: null, intent: { goal: 'test' }, trace: { skipped: true }, values: {} }),
    ).rejects.toThrow('API Key');
  });

  it('接收 knowledgeContext 不报错', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: '调研结果' });

    const result = await runResearcher({
      apiKey: 'test-key',
      intent: { goal: 'test' },
      trace: { skipped: true },
      values: {},
      subtask: { id: 1, title: 't', goal: 'g' },
      knowledgeContext: 'KB 检索：[一手] 数据',
    });

    expect(result.content).toBeDefined();
    expect(result.sourceStats).toBeDefined();
  });
});
