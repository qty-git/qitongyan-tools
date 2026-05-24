import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Play, RotateCcw, Save, Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEFAULT_PROMPTS, PromptType } from '../services/prompts';
import { testModelConnection } from '../services/llmService';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  openrouterKey: string;
  setOpenrouterKey: (key: string) => void;
  openrouterModel: string;
  setOpenrouterModel: (model: string) => void;
  showOpenrouterKey: boolean;
  setShowOpenrouterKey: (show: boolean) => void;
  customPrompts: Partial<Record<PromptType, string>>;
  setCustomPrompts: React.Dispatch<React.SetStateAction<Partial<Record<PromptType, string>>>>;
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const MODEL_OPTIONS = [
  {
    label: 'GPT-4.1 Mini',
    value: 'openai/gpt-4.1-mini',
    price: '低',
    usage: '日常综合 默认推荐'
  },
  {
    label: 'Claude 3.7 Sonnet',
    value: 'anthropic/claude-3.7-sonnet',
    price: '中高',
    usage: '标题文案 长文本'
  },
  {
    label: 'Gemini 2.5 Pro',
    value: 'google/gemini-2.5-pro',
    price: '中',
    usage: '视觉理解 推理'
  },
  {
    label: 'DeepSeek Chat',
    value: 'deepseek/deepseek-chat',
    price: '很低',
    usage: '中文低成本'
  }
];

const PROMPT_WINDOWS: Array<{ key: PromptType; title: string }> = [
  { key: 'attributesOnly', title: '属性识别 Prompt' },
  { key: 'titleOnly', title: '标题生成 Prompt' },
  { key: 'naming', title: '商品起名 Prompt' }
];

export function SettingsModal({
  showSettings,
  setShowSettings,
  openrouterKey,
  setOpenrouterKey,
  openrouterModel,
  setOpenrouterModel,
  showOpenrouterKey,
  setShowOpenrouterKey,
  customPrompts,
  setCustomPrompts
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'prompts'>('api');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [saved, setSaved] = useState(false);

  if (!showSettings) return null;

  const handleTest = async () => {
    setTestStatus('loading');
    setTestError('');
    try {
      await testModelConnection({
        provider: 'openai',
        apiKey: '',
        model: openrouterModel,
        openrouterKey,
        openrouterModel
      });
      setTestStatus('success');
    } catch (error: any) {
      setTestStatus('error');
      setTestError(error?.message || '连接失败');
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
                  前端保存 API Key 仅适合个人使用，请不要在公共网站暴露自己的 Key。
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

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">模型</label>
                <select
                  value={openrouterModel}
                  onChange={(e) => setOpenrouterModel(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-bold"
                >
                  {MODEL_OPTIONS.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label} | {model.price} | {model.usage}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {MODEL_OPTIONS.map(model => (
                    <button
                      key={model.value}
                      type="button"
                      onClick={() => setOpenrouterModel(model.value)}
                      className={cn(
                        "text-left p-3 rounded-xl border transition-all",
                        openrouterModel === model.value
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100"
                          : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-gray-900">{model.label}</span>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{model.price}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{model.usage}</p>
                      <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">{model.value}</p>
                    </button>
                  ))}
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

              <div className="flex flex-col sm:flex-row gap-3">
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
                  {testStatus === 'loading' ? '测试中...' : testStatus === 'success' ? '连接成功' : '测试连接'}
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
