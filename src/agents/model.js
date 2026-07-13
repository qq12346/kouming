/**
 * 叩鸣·工坊 — AI 模型工厂
 *
 * 从 userStore 读取模型配置，返回兼容的 Vercel AI SDK model 对象。
 * 支持 DeepSeek 和自定义 OpenAI 兼容端点。
 */
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * @param {object} config
 * @param {string} config.apiKey
 * @param {string} [config.modelProvider='deepseek']
 * @param {string} [config.customBaseURL]
 * @param {string} [config.modelName]
 * @returns {import('ai').LanguageModel}
 */
export function getModel({ apiKey, modelProvider = 'deepseek', customBaseURL, modelName }) {
  if (modelProvider === 'deepseek') {
    return createDeepSeek({ apiKey })(modelName || 'deepseek-v4-pro');
  }
  return createOpenAI({ apiKey, baseURL: customBaseURL || undefined })(modelName || 'gpt-4o');
}
