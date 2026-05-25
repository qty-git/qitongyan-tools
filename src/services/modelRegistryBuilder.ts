export type FeatureKey = 'attributesOnly' | 'titleOnly' | 'naming';
export type ModelTestStatus = 'untested' | 'testing' | 'success' | 'failed';

export interface OpenRouterRawModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
  };
  supported_parameters?: string[];
  created?: number;
}

export interface ModelTestRecord {
  status: ModelTestStatus;
  testedAt?: number;
  latencyMs?: number;
  error?: string;
}

export interface ModelRegistryOption {
  displayName: string;
  modelId: string;
  provider: string;
  version: string;
  supportsVision: boolean;
  contextLength: number;
  promptPrice: number;
  completionPrice: number;
  isFree: boolean;
  tags: string[];
  recommendedFor: string[];
  score: number;
  featureScores: Record<FeatureKey, number>;
  testStatus: ModelTestStatus;
  latencyMs?: number;
  unavailableReason?: string;
  raw: OpenRouterRawModel;
}

export interface ModelRegistryGroup {
  provider: string;
  label: string;
  models: ModelRegistryOption[];
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  attributesOnly: '属性识别',
  titleOnly: '标题生成',
  naming: '商品起名'
};

export const FEATURE_ORDER: FeatureKey[] = ['attributesOnly', 'titleOnly', 'naming'];

export const REGISTRY_CACHE_KEY = 'fashion_openrouter_model_registry_v2';
export const TEST_CACHE_KEY = 'fashion_openrouter_model_tests_v2';
const OPENROUTER_ENDPOINT = '/.netlify/functions/openai';

const providerLabels: Array<[RegExp, string]> = [
  [/^openai\//, 'OpenAI'],
  [/^google\//, 'Google Gemini'],
  [/^anthropic\/|^~anthropic\//, 'Anthropic Claude'],
  [/^x-ai\//, 'xAI Grok'],
  [/^deepseek\//, 'DeepSeek'],
  [/^moonshotai\//, 'Moonshot Kimi'],
  [/^z-ai\/|^zhipuai\//, 'Zhipu GLM'],
  [/^minimax\//, 'MiniMax'],
  [/^mistralai\//, 'Mistral'],
  [/^meta-llama\//, 'Meta Llama'],
  [/^qwen\//, 'Qwen'],
  [/^recraft-ai\//, 'Recraft'],
  [/^perplexity\//, 'Perplexity'],
  [/^openrouter\//, 'OpenRouter']
];

const textDecoder = (value?: string) => (value || '').toLowerCase();
const toPrice = (value?: string) => Number(value || 0);

export function detectProvider(model: OpenRouterRawModel) {
  for (const [pattern, label] of providerLabels) {
    if (pattern.test(model.id)) return label;
  }
  const prefix = model.id.split('/')[0] || 'Other';
  return prefix
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stripProviderName(name: string, provider: string) {
  return name.replace(new RegExp(`^${provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`, 'i'), '');
}

function detectVersion(model: OpenRouterRawModel) {
  const id = textDecoder(model.id);
  const name = textDecoder(model.name);
  const value = `${id} ${name}`;
  if (value.includes('flash-lite') || value.includes('lite')) return 'lite';
  if (value.includes('flash')) return 'flash';
  if (value.includes('mini')) return 'mini';
  if (value.includes('nano')) return 'nano';
  if (value.includes('pro')) return 'pro';
  if (value.includes('sonnet')) return 'sonnet';
  if (value.includes('haiku')) return 'haiku';
  if (value.includes('opus')) return 'opus';
  if (value.includes('max')) return 'max';
  if (value.includes('vl')) return 'vl';
  if (value.includes('vision')) return 'vision';
  if (value.includes('free')) return 'free';
  return model.id.split('/')[1]?.split(':')[0] || 'default';
}

function hasChineseAffinity(model: OpenRouterRawModel, provider: string) {
  const value = `${model.id} ${model.name || ''} ${model.description || ''}`.toLowerCase();
  return /qwen|deepseek|kimi|moonshot|glm|zhipu|minimax|baidu|hunyuan|tencent|yi-|01-ai|chinese|中文/.test(value)
    || ['Qwen', 'DeepSeek', 'Moonshot Kimi', 'Zhipu GLM', 'MiniMax'].includes(provider);
}

function hasCreativeAffinity(model: OpenRouterRawModel, provider: string) {
  const value = `${model.id} ${model.name || ''} ${model.description || ''}`.toLowerCase();
  return /grok|kimi|qwen|max|creative|opus|sonnet|chat|gemini|gpt|minimax/.test(value)
    || ['xAI Grok', 'Moonshot Kimi', 'Qwen', 'OpenAI', 'Google Gemini', 'MiniMax'].includes(provider);
}

function qualityBase(model: OpenRouterRawModel, provider: string) {
  const value = `${model.id} ${model.name || ''}`.toLowerCase();
  let score = 20;
  if (/pro|opus|max|sonnet|large|405b|235b|120b|gpt|gemini|grok|kimi/.test(value)) score += 20;
  if (/flash|mini|haiku|70b|72b|32b|30b/.test(value)) score += 12;
  if (/8b|12b|20b|nano|lite/.test(value)) score += 6;
  if (['OpenAI', 'Google Gemini', 'Anthropic Claude', 'xAI Grok', 'Qwen', 'DeepSeek', 'Moonshot Kimi'].includes(provider)) score += 8;
  return score;
}

function priceScore(model: OpenRouterRawModel) {
  const prompt = toPrice(model.pricing?.prompt);
  const completion = toPrice(model.pricing?.completion);
  const total = prompt + completion;
  if (total === 0) return 28;
  if (total <= 0.0000004) return 24;
  if (total <= 0.000002) return 20;
  if (total <= 0.00001) return 14;
  if (total <= 0.00004) return 8;
  return 3;
}

function speedScore(model: OpenRouterRawModel) {
  const value = `${model.id} ${model.name || ''}`.toLowerCase();
  let score = 8;
  if (/flash|mini|nano|lite|fast|haiku|scout/.test(value)) score += 12;
  if (/pro|opus|reasoning|thinking|405b|235b/.test(value)) score -= 4;
  return Math.max(0, score);
}

function jsonScore(model: OpenRouterRawModel) {
  const params = model.supported_parameters || [];
  let score = 6;
  if (params.includes('response_format')) score += 8;
  if (params.includes('structured_outputs')) score += 8;
  if (params.includes('tools')) score += 3;
  return score;
}

function classify(model: OpenRouterRawModel, provider: string, supportsVision: boolean) {
  const value = `${model.id} ${model.name || ''} ${model.description || ''}`.toLowerCase();
  const prompt = toPrice(model.pricing?.prompt);
  const completion = toPrice(model.pricing?.completion);
  const total = prompt + completion;
  const context = model.context_length || 0;
  const isFree = prompt === 0 && completion === 0;
  const isReasoning = /reasoning|thinking|r1|o1|o3|o4/.test(value) || (model.supported_parameters || []).includes('reasoning');
  const isExperimental = /preview|beta|experimental|exp|alpha|free/.test(value);
  const isCheap = isFree || total <= 0.000002;
  const isUltraCheap = isFree || total <= 0.0000004;
  const isLongContext = context >= 200000;
  const chinese = hasChineseAffinity(model, provider);
  const creative = hasCreativeAffinity(model, provider);

  const tags = [
    '文本模型',
    supportsVision && '视觉模型',
    supportsVision && '图片理解模型',
    isReasoning && '推理模型',
    isCheap && '高性价比模型',
    isUltraCheap && '超低价模型',
    creative && '高质量文案模型',
    isLongContext && '长上下文模型',
    isFree && '免费模型',
    isExperimental && '实验模型'
  ].filter(Boolean) as string[];

  const recommendedFor = [
    supportsVision && '适合属性识别',
    supportsVision && '适合图片理解',
    chinese && '适合中文文案',
    creative && '适合起标题',
    creative && '适合商品起名',
    isCheap && '适合低成本批量',
    isLongContext && '适合长文生成',
    isReasoning && '适合复杂推理'
  ].filter(Boolean) as string[];

  return { tags, recommendedFor };
}

function featureScore(model: OpenRouterRawModel, provider: string, feature: FeatureKey, test?: ModelTestRecord) {
  const inputModalities = model.architecture?.input_modalities || [];
  const supportsVision = inputModalities.includes('image');
  if (feature === 'attributesOnly' && !supportsVision) return -1;

  const prompt = toPrice(model.pricing?.prompt);
  const completion = toPrice(model.pricing?.completion);
  const context = model.context_length || 0;
  const tested = test?.status;
  const chinese = hasChineseAffinity(model, provider);
  const creative = hasCreativeAffinity(model, provider);

  let score = 0;
  score += feature === 'attributesOnly' && supportsVision ? 24 : 0;
  if (feature !== 'attributesOnly' && supportsVision) score -= 8;
  score += chinese ? 20 : 4;
  score += priceScore(model);
  score += speedScore(model);
  score += jsonScore(model);
  score += qualityBase(model, provider);
  score += context >= 200000 ? 8 : context >= 100000 ? 4 : 0;
  if (creative && feature !== 'attributesOnly') score += 14;
  if (feature === 'attributesOnly' && supportsVision) score += /gemini|qwen|grok|mistral|llama|kimi|gemma/.test(textDecoder(model.id)) ? 12 : 4;
  if (feature === 'titleOnly') score += /qwen|deepseek|kimi|grok|gpt|gemini|minimax|glm/.test(textDecoder(model.id)) ? 12 : 0;
  if (feature === 'naming') score += /qwen|grok|kimi|minimax|gpt|gemini|deepseek/.test(textDecoder(model.id)) ? 12 : 0;
  if (prompt + completion === 0) score += 6;
  if (tested === 'success') score += 80;
  if (tested === 'failed') score -= 200;
  if (test?.latencyMs) {
    score += Math.max(0, 12 - Math.floor(test.latencyMs / 700));
    if (test.latencyMs > 8000) score -= Math.min(35, Math.floor((test.latencyMs - 8000) / 500));
  }
  return Math.round(score);
}

export function buildModelRegistry(rawModels: OpenRouterRawModel[], testRecords: Record<string, ModelTestRecord> = {}) {
  return rawModels
    .filter(model => model.id && (model.architecture?.output_modalities || []).includes('text'))
    .map(model => {
      const provider = detectProvider(model);
      const inputModalities = model.architecture?.input_modalities || [];
      const supportsVision = inputModalities.includes('image');
      const test = testRecords[model.id];
      const featureScores = {
        attributesOnly: featureScore(model, provider, 'attributesOnly', test),
        titleOnly: featureScore(model, provider, 'titleOnly', test),
        naming: featureScore(model, provider, 'naming', test)
      };
      const meta = classify(model, provider, supportsVision);

      return {
        displayName: stripProviderName(model.name || model.id, provider),
        modelId: model.id,
        provider,
        version: detectVersion(model),
        supportsVision,
        contextLength: model.context_length || 0,
        promptPrice: toPrice(model.pricing?.prompt),
        completionPrice: toPrice(model.pricing?.completion),
        isFree: toPrice(model.pricing?.prompt) === 0 && toPrice(model.pricing?.completion) === 0,
        tags: meta.tags,
        recommendedFor: meta.recommendedFor,
        score: Math.max(featureScores.attributesOnly, featureScores.titleOnly, featureScores.naming),
        featureScores,
        testStatus: test?.status || 'untested',
        latencyMs: test?.latencyMs,
        unavailableReason: test?.status === 'failed' ? test.error : undefined,
        raw: model
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function getModelById(models: ModelRegistryOption[], modelId: string) {
  return models.find(model => model.modelId === modelId);
}

export function getEnabledModelsForFeature(models: ModelRegistryOption[], feature: FeatureKey) {
  return models
    .filter(model => model.testStatus !== 'failed')
    .filter(model => feature !== 'attributesOnly' || model.supportsVision)
    .sort((a, b) => b.featureScores[feature] - a.featureScores[feature]);
}

export function getModelGroupsForFeature(models: ModelRegistryOption[], feature: FeatureKey) {
  const grouped = new Map<string, ModelRegistryOption[]>();
  for (const model of getEnabledModelsForFeature(models, feature)) {
    grouped.set(model.provider, [...(grouped.get(model.provider) || []), model]);
  }
  return Array.from(grouped.entries())
    .map(([provider, groupModels]) => ({ provider, label: provider, models: groupModels }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function recommendDefaultModels(models: ModelRegistryOption[]): Record<FeatureKey, string> {
  const pick = (feature: FeatureKey) => {
    const tested = getEnabledModelsForFeature(models, feature).filter(model => model.testStatus === 'success');
    const candidates = tested.length > 0 ? tested : getEnabledModelsForFeature(models, feature);
    if (feature !== 'attributesOnly' && candidates[0]) {
      const textOnly = candidates.find(model => !model.supportsVision && model.featureScores[feature] >= candidates[0].featureScores[feature] - 20);
      if (textOnly) return textOnly.modelId;
    }
    return candidates[0]?.modelId || '';
  };
  return {
    attributesOnly: pick('attributesOnly'),
    titleOnly: pick('titleOnly'),
    naming: pick('naming')
  };
}

export function formatModelOption(model: ModelRegistryOption) {
  const vision = model.supportsVision ? '视觉' : '文本';
  const context = model.contextLength ? `${Math.round(model.contextLength / 1000)}K` : '未知上下文';
  const price = model.isFree ? '免费' : `入 ${model.promptPrice || 0} / 出 ${model.completionPrice || 0}`;
  const status = model.testStatus === 'success' ? '已测通' : model.testStatus === 'failed' ? '不可用' : '未测试';
  return `${model.displayName}｜${model.provider}｜${vision}｜${context}｜${price}｜${status}`;
}

export function selectModelsToTest(models: ModelRegistryOption[], limit = 32) {
  const selected = new Map<string, ModelRegistryOption>();
  const categories: Array<(model: ModelRegistryOption) => boolean> = [
    model => model.supportsVision,
    model => model.tags.includes('高质量文案模型'),
    model => model.tags.includes('高性价比模型'),
    model => model.tags.includes('超低价模型'),
    model => model.tags.includes('免费模型'),
    model => model.tags.includes('长上下文模型'),
    model => model.provider.includes('Qwen') || model.provider.includes('DeepSeek') || model.provider.includes('Kimi') || model.provider.includes('GLM') || model.provider.includes('MiniMax')
  ];

  for (const predicate of categories) {
    for (const model of models.filter(predicate).slice(0, 4)) {
      selected.set(model.modelId, model);
    }
  }
  for (const model of models.slice(0, limit)) {
    selected.set(model.modelId, model);
    if (selected.size >= limit) break;
  }
  return Array.from(selected.values()).slice(0, limit);
}

export async function fetchOpenRouterModels(openrouterKey?: string): Promise<OpenRouterRawModel[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (openrouterKey) headers.Authorization = `Bearer ${openrouterKey}`;
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'models' })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '获取 OpenRouter 模型列表失败');
  return data.models || [];
}

export async function testOpenRouterModel(model: ModelRegistryOption, openrouterKey: string): Promise<ModelTestRecord> {
  const started = Date.now();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (openrouterKey) headers.Authorization = `Bearer ${openrouterKey}`;
  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'test-model',
        model: model.modelId,
        supportsVision: model.supportsVision
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      return {
        status: 'failed',
        testedAt: Date.now(),
        latencyMs: Date.now() - started,
        error: data.error || '测试失败'
      };
    }
    return {
      status: 'success',
      testedAt: Date.now(),
      latencyMs: Date.now() - started
    };
  } catch (error: any) {
    return {
      status: 'failed',
      testedAt: Date.now(),
      latencyMs: Date.now() - started,
      error: error?.message || '测试失败'
    };
  }
}

export function loadRegistryCache(): { rawModels: OpenRouterRawModel[]; fetchedAt: number } | null {
  try {
    const value = localStorage.getItem(REGISTRY_CACHE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveRegistryCache(rawModels: OpenRouterRawModel[]) {
  localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify({ rawModels, fetchedAt: Date.now() }));
}

export function loadTestCache(): Record<string, ModelTestRecord> {
  try {
    return JSON.parse(localStorage.getItem(TEST_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveTestCache(records: Record<string, ModelTestRecord>) {
  localStorage.setItem(TEST_CACHE_KEY, JSON.stringify(records));
}
