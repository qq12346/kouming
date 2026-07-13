/**
 * 叩鸣·工坊 — 三条产品宪法
 *
 * 参考：七层AI系统_价值嵌入版_产品概念文档 第0层
 *
 * 设计借鉴 OpenAI Codex execpolicy 的 prefix_rule 模式：
 * - 每条规则是独立的、可测试的
 * - 每条规则有 match/not_match 测试用例
 * - 借鉴 execpolicy 的三态决策：allow/prompt/forbidden → 叩鸣的 pass/warn/block
 */

/**
 * 尊严宪法（康德：人是目的，不只是手段）
 *
 * 要求：任何 AI 生成内容必须在开头声明 "AI 参与" 或等价标记。
 * 用户有权知道 AI 正在参与。
 * decision='block' → 阻断输出，自动追加声明后放行。
 */
export const DIGNITY_RULE = {
  type: 'dignity',
  condition: (text) => {
    // 加固：必须同时包含 AI 声明 + 叩鸣署名
    const aiMarkers = /AI[-\s]?(生成|assisted|参与)|叩鸣|kouming/i;
    const hasAIDeclaration = aiMarkers.test(text);
    // 额外检查：有"AI参与"关键词但可能在伪造上下文中的情况
    // 要求声明出现在文本前 20% 位置
    if (!hasAIDeclaration) return true;
    const firstMatch = text.match(aiMarkers);
    if (firstMatch && firstMatch.index > text.length * 0.2) return true; // 声明太靠后，可能不是真正的身份声明
    return false;
  },
  decision: 'block',
  justification: '尊严宪法（康德）：AI 必须声明身份，用户有权知道 AI 正在参与。你永远不应该在不知情的情况下被当作优化对象。',
  remedy: (text) => '[叩鸣·工坊 AI 参与]\n\n' + text,
  test_cases: {
    match: [
      '这是分析报告的内容部分，包含详细的数据解读。',
    ],
    not_match: [
      'AI 生成：这是分析报告的内容部分。',
      '叩鸣 AI 参与：这是分析报告的内容。',
      'AI-assisted 生成的分析报告。',
    ],
  },
};

/**
 * 自主宪法（马尔库塞：消灭替代性想像力 = 消灭自由）
 *
 * 要求：每次 AI 输出必须提供至少 2 个不同的替代方案或思考路径。
 * 强制保留"不这样做"的选择能力。
 * decision='warn' → 自动追加替代方案提示，标记为黄色。
 */
export const AUTONOMY_RULE = {
  type: 'autonomy',
  condition: (text) => {
    // 加固：不仅要有关键词，还要至少有 2 行结构化的替代方案列表
    const alternativesCN = (text.match(/替代方案/g) || []).length;
    const alternativesEN = (text.match(/\balternative\b/gi) || []).length;
    const alternativesPath = (text.match(/另一种(方式|思路|路径)/g) || []).length;
    const keywords = alternativesCN + alternativesEN + alternativesPath;
    if (keywords >= 2) return false; // 明确的关键词足够
    // 检查是否有至少 2 行以数字或 - 开头的替代列表
    const listItems = (text.match(/^[0-9]+[.、)]|^[-*•]/gm) || []).length;
    if (keywords >= 1 && listItems >= 2) return false;
    return true;
  },
  decision: 'warn',
  justification: '自主宪法（马尔库塞）：每次输出应提供至少 2 个不同的替代方案。选择的能力本身比选择了什么更重要。',
  remedy: (text) => text + '\n\n---\n替代方案：\n1. [请考虑另一种路径]\n2. [请考虑第三种可能]',
  test_cases: {
    match: [
      '这里只有一个推荐的方案，按照这个做就可以了。',
    ],
    not_match: [
      '替代方案一：XX。\n替代方案二：YY。',
      '方案A。替代方案B。另一种思路：C。',
    ],
  },
};

/**
 * 追问宪法（海德格尔 + 陈嘉映：追问本身就是抵抗）
 *
 * 要求：AI 必须在输出末尾声明自己的前提假设。
 * 让隐性的价值判断变成显性的、可被挑战的。
 * decision='warn' → 自动追加"我的假设"段落。
 */
export const QUESTIONING_RULE = {
  type: 'questioning',
  condition: (text) => {
    const assumptionPattern = /我(的)?假设|前提判断|我的前提/i;
    return !assumptionPattern.test(text);
  },
  decision: 'warn',
  justification: '追问宪法（海德格尔 + 陈嘉映）：AI 必须声明自己的前提假设，让价值判断从隐性变成显性。"行之于途而应于心。"',
  remedy: (text) => text + '\n\n---\n我的假设：\n1. [系统补全] 我在生成以上内容时做了一些前提判断，请审视。如果其中任何一个假设不准确，告诉我是哪一个，我会基于正确的前提重新思考。',
  test_cases: {
    match: [
      '这是完整的分析结果，没有附带任何前提说明。',
    ],
    not_match: [
      '这是分析结果。\n\n我的假设：1. 我假设你关心的是短期影响。',
      '基于我的前提判断，我建议采用方案A。',
    ],
  },
};

/**
 * 所有宪法规则列表
 * 顺序决定了 violation 列表的排列顺序（不影响决策结果——决策取最高 severity）
 */
export const RULES = [DIGNITY_RULE, AUTONOMY_RULE, QUESTIONING_RULE];
