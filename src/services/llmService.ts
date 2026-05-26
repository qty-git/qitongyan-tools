import { DEFAULT_PROMPTS, PromptType } from "./prompts";

export type LLMProvider = 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  openrouterKey?: string;
  openrouterModel?: string;
  supportsVision?: boolean;
  onWarning?: (msg: string) => void;
  onModelChange?: (modelName: string) => void;
  customPrompts?: Partial<Record<PromptType, string>>;
}

export interface AttributeDefinition {
  category: string;
  attribute: string;
  options: string[];
}

export interface ExtractionResult {
  attributes: Record<string, string>;
  title: string;
  subtitle: string;
  productNames: string[];
}

export interface OpenRouterDebugDetail {
  targetUrl: string;
  model: string;
  provider: string;
  statusCode: number | null;
  responseMessage: string;
  openrouterReachable: boolean;
  modelResponded: boolean;
  success: boolean;
  errorType?: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  warning?: string;
  error?: string;
  errorType?: string;
  debug?: OpenRouterDebugDetail;
}

const DEFAULT_MODEL = 'openrouter/auto';
const OPENROUTER_ENDPOINT = '/.netlify/functions/openai';

function replacePlaceholders(template: string, data: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.split(`{{${key}}}`).join(String(value ?? ''));
  }
  return result;
}

const getPrompt = (type: PromptType, config: LLMConfig) => {
  const basePrompt = config.customPrompts?.[type] || DEFAULT_PROMPTS[type];
  return `${basePrompt}\n\n${getModelAdapterHint(config.openrouterModel || config.model || '')}`.trim();
};

const getModelAdapterHint = (modelId: string) => {
  const id = modelId.toLowerCase();
  const shared = '模型适配：严格遵守当前任务模板，只输出合法 JSON，不要输出解释、Markdown 或额外字段。';
  if (/gemini|gemma/.test(id)) return `${shared}\n图片理解时优先描述可见细节，避免把不可见信息当作事实。`;
  if (/gpt|openai|claude|anthropic/.test(id)) return `${shared}\n优先保持结构化字段完整，字段名必须与模板一致。`;
  if (/deepseek/.test(id)) return `${shared}\n中文电商文案要自然，避免关键词堆砌，保持 JSON 简洁稳定。`;
  if (/qwen|kimi|moonshot|glm|zhipu|minimax/.test(id)) return `${shared}\n中文语感优先，标题和命名要像真实服装商品文案。`;
  if (/grok|x-ai/.test(id)) return `${shared}\n创意可以更灵动，但必须克制，不要偏离商品本身。`;
  if (/mistral|pixtral|llama|meta/.test(id)) return `${shared}\n回答尽量短，避免多余文本，确保 JSON 可解析。`;
  return shared;
};

const flattenProductNames = (parsed: any): string[] => {
  if (!parsed.productNames) return [];
  if (Array.isArray(parsed.productNames)) return parsed.productNames;

  return [
    ...(parsed.productNames.sweet || []),
    ...(parsed.productNames.cute || []),
    ...(parsed.productNames.clothing_style || []),
    ...(parsed.productNames.random_length || [])
  ];
};

export const parseOpenRouterError = (error: unknown): string => {
  const errMsg = error instanceof Error ? error.message : String(error);
  const lower = errMsg.toLowerCase();

  if (lower.includes('401') || lower.includes('invalid_api_key')) return 'API Key 无效';
  if (lower.includes('403') || lower.includes('region') || lower.includes('not available in your region')) return '当前地区或模型不可用';
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) return '请求频率限制';
  if (lower.includes('provider unavailable') || lower.includes('provider returned error') || lower.includes('no provider')) return '当前模型供应商不可用';
  if (lower.includes('model') || lower.includes('404')) return '模型不存在或已下线';
  if (lower.includes('balance') || lower.includes('credit') || lower.includes('quota') || lower.includes('402')) return '余额不足或额度不可用';
  if (lower.includes('cors')) return '浏览器请求被拦截';
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout') || lower.includes('failed to fetch')) return '网络连接失败';
  return errMsg || 'AI 调用失败';
};

const buildFetchBlockedDetail = (model: string): OpenRouterDebugDetail => ({
  targetUrl: OPENROUTER_ENDPOINT,
  model,
  provider: model.split('/')[0] || 'unknown',
  statusCode: null,
  responseMessage: '浏览器无法访问 Netlify 函数，可能是网络、CORS、隐私插件或浏览器策略拦截。',
  openrouterReachable: false,
  modelResponded: false,
  success: false,
  errorType: 'network_or_cors'
});

const throwApiError = (data: any, fallback: string, model: string): never => {
  const error = new Error(data.error || fallback || 'AI 调用失败') as Error & { debug?: OpenRouterDebugDetail; errorType?: string; status?: number };
  error.debug = data.debug || buildFetchBlockedDetail(model);
  error.errorType = data.errorType || data.debug?.errorType;
  error.status = data.debug?.statusCode;
  throw error;
};

const postOpenRouterFunction = async (payload: Record<string, unknown>, openrouterKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (openrouterKey) {
    headers.Authorization = `Bearer ${openrouterKey}`;
  }

  try {
    return await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    const err = new Error(parseOpenRouterError(error)) as Error & { debug?: OpenRouterDebugDetail; errorType?: string };
    err.debug = buildFetchBlockedDetail(String(payload.model || DEFAULT_MODEL));
    err.errorType = 'network_or_cors';
    throw err;
  }
};

async function callOpenRouter(imageBase64: string | null, prompt: string, config: LLMConfig): Promise<ExtractionResult> {
  const model = config.openrouterModel || config.model || DEFAULT_MODEL;
  config.onModelChange?.(`OpenRouter ${model}`);
  const shouldSendImage = Boolean(imageBase64 && config.supportsVision !== false);

  const response = await postOpenRouterFunction({
    action: 'vision',
    imageBase64: shouldSendImage ? imageBase64 : null,
    prompt,
    model
  }, config.openrouterKey);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwApiError(data, parseOpenRouterError(response.statusText), model);
  }

  const parsed = data.result || {};
  return {
    attributes: parsed.attributes || {},
    title: parsed.title || '',
    subtitle: parsed.subtitle || '',
    productNames: flattenProductNames(parsed)
  };
}

export async function testOpenRouterBaseConnection(openrouterKey: string): Promise<ConnectionTestResult> {
  const response = await postOpenRouterFunction({
    action: 'basic-test',
    model: 'openrouter/auto'
  }, openrouterKey);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwApiError(data, parseOpenRouterError(response.statusText), 'openrouter/auto');
  }

  return {
    ok: Boolean(data.ok),
    warning: data.warning,
    errorType: data.errorType,
    debug: data.debug
  };
}

export async function testModelConnection(config: LLMConfig): Promise<ConnectionTestResult> {
  const model = config.openrouterModel || config.model || DEFAULT_MODEL;
  const response = await postOpenRouterFunction({
    action: 'test',
    model
  }, config.openrouterKey);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwApiError(data, parseOpenRouterError(response.statusText), model);
  }

  return {
    ok: Boolean(data.ok),
    warning: data.warning,
    errorType: data.errorType,
    debug: data.debug
  };
}

export async function extractAttributesOnly(
  imageBase64: string,
  selectedCategory: string,
  attributes: AttributeDefinition[],
  requiredAttributes: string[],
  config: LLMConfig
): Promise<Record<string, string>> {
  const relevantAttributes = attributes
    .filter(a => a.category === selectedCategory)
    .map(a => {
      const isRequired = requiredAttributes.includes(a.attribute);
      return `${a.attribute}${isRequired ? " (MANDATORY)" : ""}: [${a.options.join(", ")}]`;
    })
    .join("\n");

  const prompt = replacePlaceholders(getPrompt('attributesOnly', config), {
    category: selectedCategory,
    attributesList: relevantAttributes
  });

  const result = await callOpenRouter(imageBase64, prompt, config);
  return result.attributes;
}

export async function generateTitlesOnly(
  imageBase64: string,
  selectedCategory: string,
  attributes: Record<string, string>,
  hotKeywords: string,
  config: LLMConfig,
  _titleLengthRange: [number, number] = [22, 25]
): Promise<{ title: string; subtitle: string }> {
  const hasAttributes = Object.keys(attributes || {}).length > 0;
  const promptType: PromptType = hasAttributes ? 'attributeEnhancedTitleMode' : 'visualTitleMode';
  const prompt = replacePlaceholders(getPrompt(promptType, config), {
    category: selectedCategory,
    attributes: JSON.stringify(attributes, null, 2),
    hotKeywords
  });

  const result = await callOpenRouter(imageBase64, prompt, config);
  return {
    title: result.title,
    subtitle: result.subtitle
  };
}

export async function generateProductNamesOnly(
  imageBase64: string,
  selectedCategory: string,
  config: LLMConfig,
  namingFeedback = ''
): Promise<string[]> {
  const feedback = namingFeedback
    ? `历史反馈参考：${namingFeedback}`
    : '';

  const prompt = replacePlaceholders(getPrompt('naming', config), {
    category: selectedCategory,
    namingFeedback: feedback
  });

  const result = await callOpenRouter(imageBase64, prompt, config);
  return result.productNames;
}
