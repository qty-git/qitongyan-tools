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

const DEFAULT_MODEL = 'openai/gpt-4.1-mini';
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

const parseApiError = (error: unknown): string => {
  const errMsg = error instanceof Error ? error.message : String(error);
  const lower = errMsg.toLowerCase();

  if (lower.includes('api key') || lower.includes('401')) return 'API Key 无效';
  if (lower.includes('model') || lower.includes('404')) return '模型不存在';
  if (lower.includes('balance') || lower.includes('credit') || lower.includes('quota') || lower.includes('402') || lower.includes('429')) return '余额不足或调用频率过高';
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) return '网络错误';
  return errMsg || 'AI 调用失败';
};

async function callOpenRouter(imageBase64: string | null, prompt: string, config: LLMConfig): Promise<ExtractionResult> {
  const model = config.openrouterModel || config.model || DEFAULT_MODEL;
  config.onModelChange?.(`OpenRouter ${model}`);
  const shouldSendImage = Boolean(imageBase64 && config.supportsVision !== false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.openrouterKey) {
    headers.Authorization = `Bearer ${config.openrouterKey}`;
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'vision',
      imageBase64: shouldSendImage ? imageBase64 : null,
      prompt,
      model
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || parseApiError(response.statusText));
  }

  const parsed = data.result || {};
  return {
    attributes: parsed.attributes || {},
    title: parsed.title || '',
    subtitle: parsed.subtitle || '',
    productNames: flattenProductNames(parsed)
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
  const prompt = replacePlaceholders(getPrompt('titleOnly', config), {
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

export async function testModelConnection(config: LLMConfig): Promise<boolean> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.openrouterKey) {
    headers.Authorization = `Bearer ${config.openrouterKey}`;
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'test',
      model: config.openrouterModel || config.model || DEFAULT_MODEL
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || parseApiError(response.statusText));
  }

  return Boolean(data.ok);
}
