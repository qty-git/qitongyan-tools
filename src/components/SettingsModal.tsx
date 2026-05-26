import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Play, RotateCcw, Save, Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEFAULT_PROMPTS, PromptType } from '../services/prompts';
import {
  ConnectionTestResult,
  OpenRouterDebugDetail,
  testModelConnection,
  testOpenRouterBaseConnection
} from '../services/llmService';
import {
  FEATURE_LABELS,
  FEATURE_ORDER,
  FeatureKey,
  ModelRegistryOption,
  formatModelOption,
  getModelGroupsForFeature,
  getModelById
} from '../services/modelRegistryBuilder';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  openrouterKey: string;
  setOpenrouterKey: (key: string) => void;
  featureModels: Record<FeatureKey, string>;
  setFeatureModels: React.Dispatch<React.SetStateAction<Record<FeatureKey, string>>>;
  modelRegistry: ModelRegistryOption[];
  modelRegistryLoading: boolean;
  modelRegistryTesting: boolean;
  modelRegistryError: string | null;
  modelRegistryFetchedAt: number | null;
  refreshModelRegistry: () => Promise<void>;
  testRecommendedModels: () => Promise<void>;
  advancedModelMode: boolean;
  setAdvancedModelMode: (enabled: boolean) => void;
  showOpenrouterKey: boolean;
  setShowOpenrouterKey: (show: boolean) => void;
  customPrompts: Partial<Record<PromptType, string>>;
  setCustomPrompts: React.Dispatch<React.SetStateAction<Partial<Record<PromptType, string>>>>;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const PROMPT_WINDOWS: Array<{ key: PromptType; title: string }> = [
  { key: 'attributesOnly', title: '属性识别 Prompt' },
  { key: 'visualTitleMode', title: '标题生成 Prompt：视觉模式' },
  { key: 'attributeEnhancedTitleMode', title: '标题生成 Prompt：属性增强模式' },
  { key: 'naming', title: '商品起名 Prompt' }
];

type ConnectionDetailRow = {
  label: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  detail?: OpenRouterDebugDetail;
};

export function SettingsModal({
  showSettings,
  setShowSettings,
  openrouterKey,
  setOpenrouterKey,
  featureModels,
  setFeatureModels,
  modelRegistry,
  modelRegistryLoading,
  modelRegistryTesting,
  modelRegistryError,
  modelRegistryFetchedAt,
  refreshModelRegistry,
  testRecommendedModels,
  advancedModelMode,
  setAdvancedModelMode,
  showOpenrouterKey,
  setShowOpenrouterKey,
  customPrompts,
  setCustomPrompts
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'prompts'>('api');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [baseTestStatus, setBaseTestStatus] = useState<'idle' | 'loading' | 'success' | 'warning' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetailRow[]>([]);
  const [saved, setSaved] = useState(false);

  if (!showSettings) return null;

  const resultToRow = (label: string, result: ConnectionTestResult): ConnectionDetailRow => ({
    label,
    status: result.warning ? 'warning' : result.ok ? 'success' : 'error',
    message: result.warning || (result.ok ? '连接成功' : result.error || '连接失败'),
    detail: result.debug
  });

  const errorToRow = (label: string, error: any): ConnectionDetailRow => ({
    label,
    status: 'error',
    message: error?.message || '连接失败',
    detail: error?.debug
  });

  const handleBaseTest = async () => {
    setBaseTestStatus('loading');
    setTestError('');
    setConnectionDetails([]);
    try {
      const result = await testOpenRouterBaseConnection(openrouterKey);
      setConnectionDetails([resultToRow('OpenRouter 基础连接', result)]);
      setBaseTestStatus(result.warning ? 'warning' : 'success');
    } catch (error: any) {
      setConnectionDetails([errorToRow('OpenRouter 基础连接', error)]);
      setBaseTestStatus('error');
      setTestError(error?.message || '基础连接失败');
    }
  };

  const handleTest = async () => {
    setTestStatus('loading');
    setTestError('');
    const rows: ConnectionDetailRow[] = [];
    for (const feature of FEATURE_ORDER) {
      try {
        const modelId = featureModels[feature];
        const result = await testModelConnection({
          provider: 'openai',
          apiKey: '',
          model: modelId,
          openrouterKey,
          openrouterModel: modelId
        });
        rows.push(resultToRow(FEATURE_LABELS[feature], result));
      } catch (error: any) {
        rows.push(errorToRow(FEATURE_LABELS[feature], error));
      }
    }

    setConnectionDetails(rows);
    if (rows.some(row => row.status === 'error')) {
      setTestStatus('error');
      setTestError('部分模型测试失败，请查看连接测试详情。');
    } else {
      setTestStatus('success');
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handlePromptChange = (type: PromptType, value: string) => {
    setCustomPrompts(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const restoreDefaultPrompts = () => {
    setCustomPrompts({ ...DEFAULT_PROMPTS });
  };

  const useRecommendedModels = () => {
    const recommended = FEATURE_ORDER.reduce((acc, feature) => {
      const model = getModelGroupsForFeature(modelRegistry, feature)[0]?.models[0];
      acc[feature] = model?.modelId || featureModels[feature] || '';
      return acc;
    }, {} as Record<FeatureKey, string>);
    setFeatureModels(recommended);
  };

  const setFeatureModel = (feature: FeatureKey, modelId: string) => {
    setFeatureModels(prev => ({
      ...prev,
      [feature]: modelId
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">系统设置</h2>
              <p className="text-xs text-gray-500">OpenRouter 配置与三项独立 Prompt</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('api')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-colors",
                activeTab === 'api' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
              )}
            >
              AI 配置
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-colors",
                activeTab === 'prompts' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
              )}
            >
              Prompt 设置
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'api' ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 text-amber-800">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">
                  前端保存 API Key 仅适合个人使用，请不要在公共网站暴露自己的 Key。OpenRouter 可降低直连官方 API 的网络和地区问题，但具体模型仍受供应商、账户和地区限制，以测试结果为准。
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">OpenRouter API Key</label>
                <div className="relative">
                  <input
                    type={showOpenrouterKey ? 'text' : 'password'}
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder="粘贴 sk-or- 开头的 OpenRouter Key"
                    className="w-full p-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showOpenrouterKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">动态模型生态</label>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {modelRegistryFetchedAt ? `已缓存 ${modelRegistry.length} 个 OpenRouter 模型` : '启动后自动拉取 OpenRouter 模型'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={refreshModelRegistry}
                      disabled={modelRegistryLoading}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-xs font-black disabled:opacity-50"
                    >
                      {modelRegistryLoading ? '刷新中...' : '刷新模型'}
                    </button>
                    <button
                      type="button"
                      onClick={testRecommendedModels}
                      disabled={!openrouterKey || modelRegistryTesting || modelRegistry.length === 0}
                      className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-xs font-black disabled:opacity-50"
                    >
                      {modelRegistryTesting ? '测试中...' : '自动测试'}
                    </button>
                    <button
                      type="button"
                      onClick={useRecommendedModels}
                      disabled={modelRegistry.length === 0}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-black disabled:opacity-50"
                    >
                      一键推荐
                    </button>
                  </div>
                </div>
                {modelRegistryError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 font-medium">
                    {modelRegistryError}
                  </div>
                )}
                <label className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={advancedModelMode}
                    onChange={(e) => setAdvancedModelMode(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  高级模式：允许手动输入任意 OpenRouter model id
                </label>

                <div className="grid grid-cols-1 gap-3">
                  {FEATURE_ORDER.map(feature => {
                    const selectedModel = getModelById(modelRegistry, featureModels[feature]);
                    return (
                      <div key={feature} className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <label className="text-sm font-black text-gray-900">{FEATURE_LABELS[feature]}模型</label>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {feature === 'attributesOnly' ? '仅显示支持图片的模型' : '可选择视觉模型或文本模型'}
                            </p>
                          </div>
                          {selectedModel && (
                            <span className={cn(
                              "shrink-0 px-2 py-1 rounded-full text-[10px] font-black",
                              selectedModel.supportsVision ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                            )}>
                              {selectedModel.supportsVision ? '支持图片' : '文本'}
                            </span>
                          )}
                        </div>
                        <select
                          value={featureModels[feature]}
                          onChange={(e) => setFeatureModel(feature, e.target.value)}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-bold"
                        >
                          {getModelGroupsForFeature(modelRegistry, feature).map(group => (
                            <optgroup key={`${feature}-${group.provider}`} label={group.label}>
                              {group.models.map(model => (
                                <option key={`${feature}-${model.modelId}`} value={model.modelId}>
                                  {formatModelOption(model)}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {advancedModelMode && (
                          <input
                            value={featureModels[feature]}
                            onChange={(e) => setFeatureModel(feature, e.target.value.trim())}
                            placeholder="手动输入 OpenRouter model id"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-mono"
                          />
                        )}
                        {selectedModel && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-gray-400 font-mono truncate">{selectedModel.modelId}</p>
                            <p className="text-[11px] text-gray-500">
                              上下文 {selectedModel.contextLength ? Math.round(selectedModel.contextLength / 1000) + 'K' : '未知'} ｜ 输入价 {selectedModel.promptPrice} ｜ 输出价 {selectedModel.completionPrice} ｜ {selectedModel.isFree ? '免费' : '付费'} ｜ {selectedModel.testStatus === 'success' ? '测试成功' : selectedModel.testStatus === 'failed' ? `不可用：${selectedModel.unavailableReason}` : '未测试'}
                            </p>
                            <p className="text-[11px] text-blue-600 font-medium">{selectedModel.recommendedFor.slice(0, 5).join('、')}</p>
                            <p className="text-[11px] text-gray-500">{selectedModel.tags.slice(0, 8).join('、')}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">固定 Base URL</label>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-600">
                  {OPENROUTER_BASE_URL}
                </div>
              </div>

              {testStatus === 'error' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 font-medium">
                  {testError}
                </div>
              )}

              {connectionDetails.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">连接测试详情</label>
                    <p className="text-[11px] text-gray-500 mt-1">
                      这里区分 OpenRouter 是否可达、模型是否响应，以及具体状态码。
                    </p>
                  </div>
                  <div className="space-y-2">
                    {connectionDetails.map((row, index) => (
                      <div
                        key={`${row.label}-${index}`}
                        className={cn(
                          "p-4 rounded-xl border text-sm",
                          row.status === 'success' && "bg-green-50 border-green-100 text-green-800",
                          row.status === 'warning' && "bg-amber-50 border-amber-100 text-amber-800",
                          row.status === 'error' && "bg-red-50 border-red-100 text-red-800"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black">{row.label}</p>
                          <span className="text-[10px] font-black uppercase">
                            {row.status === 'success' ? '成功' : row.status === 'warning' ? 'OpenRouter 可达' : '失败'}
                          </span>
                        </div>
                        <p className="mt-1 font-medium">{row.message}</p>
                        {row.detail && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-gray-600">
                            <span>URL: {row.detail.targetUrl}</span>
                            <span>模型: {row.detail.model}</span>
                            <span>Provider: {row.detail.provider}</span>
                            <span>Status: {row.detail.statusCode ?? '无'}</span>
                            <span>OpenRouter: {row.detail.openrouterReachable ? '已连接' : '未连接'}</span>
                            <span>模型响应: {row.detail.modelResponded ? '已返回' : '未返回'}</span>
                            <span>类型: {row.detail.errorType || '无'}</span>
                            <span className="sm:col-span-2 break-words">消息: {row.detail.responseMessage || '无'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBaseTest}
                  disabled={!openrouterKey || baseTestStatus === 'loading'}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    !openrouterKey || baseTestStatus === 'loading'
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : baseTestStatus === 'success'
                        ? "bg-green-600 text-white"
                        : baseTestStatus === 'warning'
                          ? "bg-amber-600 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {baseTestStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : baseTestStatus === 'success' ? <CheckCircle2 size={16} /> : <Play size={16} />}
                  {baseTestStatus === 'loading' ? '测试中...' : baseTestStatus === 'success' ? 'OpenRouter 连接成功' : '测试 OpenRouter 基础连接'}
                </button>
                <button
                  onClick={handleTest}
                  disabled={!openrouterKey || testStatus === 'loading'}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                    !openrouterKey || testStatus === 'loading'
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : testStatus === 'success'
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {testStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : testStatus === 'success' ? <CheckCircle2 size={16} /> : <Play size={16} />}
                  {testStatus === 'loading' ? '测试中...' : testStatus === 'success' ? '三项模型连接成功' : '测试三项模型'}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {saved ? '已保存' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-gray-900">Prompt 设置</h3>
                  <p className="text-xs text-gray-500 mt-1">三个功能独立执行，分别使用各自的提示词。</p>
                </div>
                <button
                  onClick={restoreDefaultPrompts}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-bold flex items-center gap-2"
                >
                  <RotateCcw size={15} />
                  恢复默认提示词
                </button>
              </div>

              {PROMPT_WINDOWS.map(item => (
                <div key={item.key} className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{item.title}</label>
                  <textarea
                    value={customPrompts[item.key] || DEFAULT_PROMPTS[item.key]}
                    onChange={(e) => handlePromptChange(item.key, e.target.value)}
                    className="w-full min-h-[220px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y text-sm leading-6 font-mono"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
