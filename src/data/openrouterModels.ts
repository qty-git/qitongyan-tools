export type FeatureKey = 'attributesOnly' | 'titleOnly' | 'naming';

export interface OpenRouterModelOption {
  displayName: string;
  modelId: string;
  provider: string;
  version: string;
  priceLevel: string;
  speedLevel: string;
  qualityLevel: string;
  recommendedFor: string[];
  supportsVision: boolean;
  enabled: boolean;
}

export const PROVIDER_GROUPS = [
  { provider: 'OpenAI', label: 'OpenAI' },
  { provider: 'Google', label: 'Google Gemini' },
  { provider: 'Anthropic', label: 'Anthropic Claude' },
  { provider: 'DeepSeek', label: 'DeepSeek' },
  { provider: 'Meta', label: 'Meta Llama' },
  { provider: 'Qwen', label: 'Qwen' }
];

export const OPENROUTER_MODELS: OpenRouterModelOption[] = [
  {
    displayName: 'GPT OSS 120B',
    modelId: 'openai/gpt-oss-120b',
    provider: 'OpenAI',
    version: 'oss 120b',
    priceLevel: '很低',
    speedLevel: '中速',
    qualityLevel: '中高',
    recommendedFor: ['开源文本', '标题备用', '起名备用'],
    supportsVision: false,
    enabled: true
  },
  {
    displayName: 'GPT OSS 20B',
    modelId: 'openai/gpt-oss-20b',
    provider: 'OpenAI',
    version: 'oss 20b',
    priceLevel: '很低',
    speedLevel: '快速',
    qualityLevel: '中',
    recommendedFor: ['低价文本', '快速备用'],
    supportsVision: false,
    enabled: true
  },
  {
    displayName: 'Gemma 3 27B',
    modelId: 'google/gemma-3-27b-it',
    provider: 'Google',
    version: 'gemma 27b',
    priceLevel: '很低',
    speedLevel: '快速',
    qualityLevel: '中高',
    recommendedFor: ['低价视觉', '属性备用'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'Gemma 3 12B',
    modelId: 'google/gemma-3-12b-it',
    provider: 'Google',
    version: 'gemma 12b',
    priceLevel: '很低',
    speedLevel: '快速',
    qualityLevel: '中',
    recommendedFor: ['低价视觉', '快速备用'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'DeepSeek V4 Flash',
    modelId: 'deepseek/deepseek-v4-flash',
    provider: 'DeepSeek',
    version: 'flash',
    priceLevel: '很低',
    speedLevel: '快速',
    qualityLevel: '中高',
    recommendedFor: ['中文低成本', '标题生成', '商品起名'],
    supportsVision: false,
    enabled: true
  },
  {
    displayName: 'DeepSeek V4 Pro',
    modelId: 'deepseek/deepseek-v4-pro',
    provider: 'DeepSeek',
    version: 'pro',
    priceLevel: '低价',
    speedLevel: '中速',
    qualityLevel: '高',
    recommendedFor: ['中文文案', '推理备用', '商品起名'],
    supportsVision: false,
    enabled: true
  },
  {
    displayName: 'DeepSeek V3.2',
    modelId: 'deepseek/deepseek-v3.2',
    provider: 'DeepSeek',
    version: 'v3.2',
    priceLevel: '低价',
    speedLevel: '快速',
    qualityLevel: '中高',
    recommendedFor: ['中文低成本', '文案备用'],
    supportsVision: false,
    enabled: true
  },
  {
    displayName: 'Llama 4 Maverick',
    modelId: 'meta-llama/llama-4-maverick',
    provider: 'Meta',
    version: 'maverick',
    priceLevel: '低价',
    speedLevel: '快速',
    qualityLevel: '中高',
    recommendedFor: ['开源视觉', '属性备用'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'Llama 4 Scout',
    modelId: 'meta-llama/llama-4-scout',
    provider: 'Meta',
    version: 'scout',
    priceLevel: '很低',
    speedLevel: '快速',
    qualityLevel: '中',
    recommendedFor: ['低价视觉', '备用'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'Llama 3.3 70B Instruct',
    modelId: 'meta-llama/llama-3.3-70b-instruct',
    provider: 'Meta',
    version: '70b',
    priceLevel: '低价',
    speedLevel: '中速',
    qualityLevel: '中高',
    recommendedFor: ['开源文案', '备用'],
    supportsVision: false,
    enabled: true
  },
  {
    displayName: 'Qwen3 VL 235B Instruct',
    modelId: 'qwen/qwen3-vl-235b-a22b-instruct',
    provider: 'Qwen',
    version: 'vl 235b',
    priceLevel: '低价',
    speedLevel: '中速',
    qualityLevel: '高',
    recommendedFor: ['视觉识别', '属性识别', '中文视觉'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'Qwen3 VL 30B Instruct',
    modelId: 'qwen/qwen3-vl-30b-a3b-instruct',
    provider: 'Qwen',
    version: 'vl 30b',
    priceLevel: '很低',
    speedLevel: '快速',
    qualityLevel: '中高',
    recommendedFor: ['低价视觉', '属性备用'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'Qwen2.5 VL 72B Instruct',
    modelId: 'qwen/qwen2.5-vl-72b-instruct',
    provider: 'Qwen',
    version: 'vl 72b',
    priceLevel: '低价',
    speedLevel: '快速',
    qualityLevel: '中高',
    recommendedFor: ['中文视觉', '备用'],
    supportsVision: true,
    enabled: true
  },
  {
    displayName: 'Qwen3.7 Max',
    modelId: 'qwen/qwen3.7-max',
    provider: 'Qwen',
    version: 'max',
    priceLevel: '中价',
    speedLevel: '中速',
    qualityLevel: '高',
    recommendedFor: ['中文文案', '创意命名', '标题生成'],
    supportsVision: false,
    enabled: true
  }
];

export const DEFAULT_FEATURE_MODELS: Record<FeatureKey, string> = {
  attributesOnly: 'qwen/qwen3-vl-235b-a22b-instruct',
  titleOnly: 'qwen/qwen3.7-max',
  naming: 'qwen/qwen3-vl-235b-a22b-instruct'
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  attributesOnly: '属性识别',
  titleOnly: '标题生成',
  naming: '商品起名'
};

export const FEATURE_ORDER: FeatureKey[] = ['attributesOnly', 'titleOnly', 'naming'];

export function getModelById(modelId: string) {
  return OPENROUTER_MODELS.find(model => model.modelId === modelId);
}

export function getEnabledModelsForFeature(feature: FeatureKey) {
  return OPENROUTER_MODELS.filter(model => model.enabled && (feature !== 'attributesOnly' || model.supportsVision));
}

export function getEnabledModelGroupsForFeature(feature: FeatureKey) {
  const models = getEnabledModelsForFeature(feature);
  return PROVIDER_GROUPS.map(group => ({
    ...group,
    models: models.filter(model => model.provider === group.provider)
  })).filter(group => group.models.length > 0);
}

export function formatModelOption(model: OpenRouterModelOption) {
  return `${model.displayName}｜${model.provider}｜${model.version}｜${model.priceLevel}｜${model.recommendedFor.join('、')}`;
}
