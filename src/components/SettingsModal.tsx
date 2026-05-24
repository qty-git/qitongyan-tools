import React, { useState } from 'react';
import { Settings, X, Globe, Key, Eye, EyeOff, Play, CheckCircle2, AlertCircle, Loader2, Sparkles, Zap, Cloud } from 'lucide-react';
import { LLMProvider, testModelConnection } from '../services/llmService';
import { DEFAULT_PROMPTS } from '../services/prompts';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  llmProvider: LLMProvider;
  setLlmProvider: (provider: LLMProvider) => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  showGeminiKey: boolean;
  setShowGeminiKey: (show: boolean) => void;
  doubaoKey: string;
  setDoubaoKey: (key: string) => void;
  showDoubaoKey: boolean;
  setShowDoubaoKey: (show: boolean) => void;
  doubaoVisionModel: string;
  setDoubaoVisionModel: (model: string) => void;
  doubaoTextModel: string;
  setDoubaoTextModel: (model: string) => void;
  doubaoEndpoint: string;
  setDoubaoEndpoint: (endpoint: string) => void;
  qwenKey: string;
  setQwenKey: (key: string) => void;
  showQwenKey: boolean;
  setShowQwenKey: (show: boolean) => void;
  customPrompts: any;
  setCustomPrompts: (prompts: any) => void;
}

export function SettingsModal({
  showSettings,
  setShowSettings,
  llmProvider,
  setLlmProvider,
  geminiKey,
  setGeminiKey,
  showGeminiKey,
  setShowGeminiKey,
  doubaoKey,
  setDoubaoKey,
  showDoubaoKey,
  setShowDoubaoKey,
  doubaoVisionModel,
  setDoubaoVisionModel,
  doubaoTextModel,
  setDoubaoTextModel,
  doubaoEndpoint,
  setDoubaoEndpoint,
  qwenKey,
  setQwenKey,
  showQwenKey,
  setShowQwenKey,
  customPrompts,
  setCustomPrompts
}: SettingsModalProps) {
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'api' | 'prompts' | 'bulk'>('api');
  const [promptProvider, setPromptProvider] = useState<'gemini' | 'doubao' | 'qwen'>('gemini');
  const [promptType, setPromptType] = useState<'naming' | 'attributesOnly' | 'titleOnly' | 'allInOne'>('allInOne');
  const [bulkJson, setBulkJson] = useState(JSON.stringify(customPrompts, null, 2));

  const handleApplyBulkJson = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      setCustomPrompts(parsed);
      setTestStatus(prev => ({ ...prev, bulk: 'success' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, bulk: 'idle' })), 2000);
    } catch (err: any) {
      setTestError(prev => ({ ...prev, bulk: 'JSON 格式错误: ' + err.message }));
      setTestStatus(prev => ({ ...prev, bulk: 'error' }));
    }
  };

  const handleTest = async (provider: LLMProvider) => {
    if (provider === 'auto') return;
    
    setTestStatus(prev => ({ ...prev, [provider]: 'loading' }));
    setTestError(prev => ({ ...prev, [provider]: '' }));

    try {
      const config = {
        geminiKey,
        doubaoKey,
        doubaoVisionModel,
        doubaoTextModel,
        doubaoEndpoint,
        qwenKey,
        provider,
        apiKey: provider === 'gemini' ? geminiKey : (provider === 'doubao' ? doubaoKey : qwenKey),
        model: '' // Not needed for simple test
      };
      await testModelConnection(provider, config as any);
      setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 3000);
    } catch (err: any) {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
      setTestError(prev => ({ ...prev, [provider]: err.message || '测试失败' }));
    }
  };
  return (
    <>
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setShowSettings(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">系统设置</h2>
                  <p className="text-xs text-gray-500">配置 API Key 与 AI 提示词</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveTab('api')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-bold transition-all border-b-2",
                  activeTab === 'api' ? "text-blue-600 border-blue-600 bg-blue-50/30" : "text-gray-500 border-transparent hover:bg-gray-50"
                )}
              >
                API 配置
              </button>
              <button 
                onClick={() => setActiveTab('prompts')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-bold transition-all border-b-2",
                  activeTab === 'prompts' ? "text-blue-600 border-blue-600 bg-blue-50/30" : "text-gray-500 border-transparent hover:bg-gray-50"
                )}
              >
                提示词自定义
              </button>
              <button 
                onClick={() => {
                  setActiveTab('bulk');
                  setBulkJson(JSON.stringify(customPrompts, null, 2));
                }}
                className={cn(
                  "flex-1 py-3 text-[10px] font-bold transition-all border-b-2",
                  activeTab === 'bulk' ? "text-blue-600 border-blue-600 bg-blue-50/30" : "text-gray-500 border-transparent hover:bg-gray-50"
                )}
              >
                批量 JSON
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {activeTab === 'api' ? (
                <>
                  {/* Model Selection Buttons */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Zap size={16} className="text-yellow-500" />
                      运行模式选择
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLlmProvider('auto')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all font-bold text-sm",
                          llmProvider === 'auto' 
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" 
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <Globe size={16} />
                        智能轮询 (推荐)
                      </button>
                      <button
                        onClick={() => setLlmProvider('gemini')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all font-bold text-sm",
                          llmProvider === 'gemini' 
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" 
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <Sparkles size={16} />
                        仅使用 Gemini
                      </button>
                      <button
                        onClick={() => setLlmProvider('doubao')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all font-bold text-sm",
                          llmProvider === 'doubao' 
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" 
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <Zap size={16} />
                        仅使用 豆包
                      </button>
                      <button
                        onClick={() => setLlmProvider('qwen')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 transition-all font-bold text-sm",
                          llmProvider === 'qwen' 
                            ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" 
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <Cloud size={16} />
                        仅使用 千问
                      </button>
                    </div>
                  </div>

                  {/* Fallback Info */}
                  {llmProvider === 'auto' && (
                    <div 
                      className="bg-blue-50 p-4 rounded-2xl border border-blue-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                          <Globe size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-blue-900">智能轮询模式已开启</h3>
                          <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
                            系统将按顺序尝试调用模型：<span className="font-bold underline">Gemini ➔ 豆包 ➔ 通义千问</span>。<br />
                            如果首选模型受限或报错，将自动切换至下一个可用模型。请确保至少配置一个有效的 API Key。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Key Inputs */}
                  <div className="space-y-6">
                    {/* Gemini Section */}
                    <div className={cn(
                      "space-y-3 p-4 rounded-2xl border transition-all",
                      llmProvider === 'gemini' ? "bg-blue-50/30 border-blue-200 ring-1 ring-blue-100" : "bg-gray-50 border-gray-100"
                    )}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          ✨ Gemini {llmProvider === 'auto' && '(首选)'}
                        </label>
                        <div className="flex items-center gap-2">
                          {geminiKey && <span className="text-[10px] text-green-600 font-bold">已配置</span>}
                          <button
                            onClick={() => handleTest('gemini')}
                            disabled={!geminiKey || testStatus['gemini'] === 'loading'}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                              testStatus['gemini'] === 'success' ? "bg-green-100 text-green-700" :
                              testStatus['gemini'] === 'error' ? "bg-red-100 text-red-700" :
                              "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            )}
                          >
                            {testStatus['gemini'] === 'loading' ? <Loader2 size={10} className="animate-spin" /> : 
                             testStatus['gemini'] === 'success' ? <CheckCircle2 size={10} /> :
                             testStatus['gemini'] === 'error' ? <AlertCircle size={10} /> : <Play size={10} />}
                            {testStatus['gemini'] === 'loading' ? '测试中...' : 
                             testStatus['gemini'] === 'success' ? '连接成功' :
                             testStatus['gemini'] === 'error' ? '连接失败' : '测试连接'}
                          </button>
                        </div>
                      </div>
                      {testStatus['gemini'] === 'error' && (
                        <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                          {testError['gemini']}
                        </p>
                      )}
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type={showGeminiKey ? "text" : "password"}
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="输入 Gemini API Key..."
                          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        使用模型: gemini-1.5-flash (提取) / gemini-1.5-pro (精修)
                      </p>
                    </div>

                    {/* Doubao Section */}
                    <div className={cn(
                      "space-y-3 p-4 rounded-2xl border transition-all",
                      llmProvider === 'doubao' ? "bg-blue-50/30 border-blue-200 ring-1 ring-blue-100" : "bg-gray-50 border-gray-100"
                    )}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          📦 豆包 {llmProvider === 'auto' && '(备选 1)'}
                        </label>
                        <div className="flex items-center gap-2">
                          {doubaoKey && doubaoVisionModel && doubaoTextModel && <span className="text-[10px] text-green-600 font-bold">已配置</span>}
                          <button
                            onClick={() => handleTest('doubao')}
                            disabled={!doubaoKey || !doubaoTextModel || testStatus['doubao'] === 'loading'}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                              testStatus['doubao'] === 'success' ? "bg-green-100 text-green-700" :
                              testStatus['doubao'] === 'error' ? "bg-red-100 text-red-700" :
                              "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            )}
                          >
                            {testStatus['doubao'] === 'loading' ? <Loader2 size={10} className="animate-spin" /> : 
                             testStatus['doubao'] === 'success' ? <CheckCircle2 size={10} /> :
                             testStatus['doubao'] === 'error' ? <AlertCircle size={10} /> : <Play size={10} />}
                            {testStatus['doubao'] === 'loading' ? '测试中...' : 
                             testStatus['doubao'] === 'success' ? '连接成功' :
                             testStatus['doubao'] === 'error' ? '连接失败' : '测试连接'}
                          </button>
                        </div>
                      </div>
                      {testStatus['doubao'] === 'error' && (
                        <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                          {testError['doubao']}
                        </p>
                      )}
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type={showDoubaoKey ? "text" : "password"}
                          value={doubaoKey}
                          onChange={(e) => setDoubaoKey(e.target.value)}
                          placeholder="输入火山引擎 API Key..."
                          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDoubaoKey(!showDoubaoKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showDoubaoKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">视觉模型 ID</label>
                          <input 
                            type="text"
                            value={doubaoVisionModel}
                            onChange={(e) => setDoubaoVisionModel(e.target.value)}
                            placeholder="ep-..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">文本模型 ID</label>
                          <input 
                            type="text"
                            value={doubaoTextModel}
                            onChange={(e) => setDoubaoTextModel(e.target.value)}
                            placeholder="ep-..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">API 地址 (可选)</label>
                        <input 
                          type="text"
                          value={doubaoEndpoint}
                          onChange={(e) => setDoubaoEndpoint(e.target.value)}
                          placeholder="默认使用火山引擎标准地址"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">
                        提示：豆包识别速度已通过图片压缩算法优化。
                      </p>
                    </div>

                    {/* Qwen Section */}
                    <div className={cn(
                      "space-y-3 p-4 rounded-2xl border transition-all",
                      llmProvider === 'qwen' ? "bg-blue-50/30 border-blue-200 ring-1 ring-blue-100" : "bg-gray-50 border-gray-100"
                    )}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          ☁️ 通义千问 {llmProvider === 'auto' && '(备选 2)'}
                        </label>
                        <div className="flex items-center gap-2">
                          {qwenKey && <span className="text-[10px] text-green-600 font-bold">已配置</span>}
                          <button
                            onClick={() => handleTest('qwen')}
                            disabled={!qwenKey || testStatus['qwen'] === 'loading'}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
                              testStatus['qwen'] === 'success' ? "bg-green-100 text-green-700" :
                              testStatus['qwen'] === 'error' ? "bg-red-100 text-red-700" :
                              "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            )}
                          >
                            {testStatus['qwen'] === 'loading' ? <Loader2 size={10} className="animate-spin" /> : 
                             testStatus['qwen'] === 'success' ? <CheckCircle2 size={10} /> :
                             testStatus['qwen'] === 'error' ? <AlertCircle size={10} /> : <Play size={10} />}
                            {testStatus['qwen'] === 'loading' ? '测试中...' : 
                             testStatus['qwen'] === 'success' ? '连接成功' :
                             testStatus['qwen'] === 'error' ? '连接失败' : '测试连接'}
                          </button>
                        </div>
                      </div>
                      {testStatus['qwen'] === 'error' && (
                        <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                          {testError['qwen']}
                        </p>
                      )}
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type={showQwenKey ? "text" : "password"}
                          value={qwenKey}
                          onChange={(e) => setQwenKey(e.target.value)}
                          placeholder="输入 DashScope API Key..."
                          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowQwenKey(!showQwenKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showQwenKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        使用模型: qwen-vl-plus (视觉) / qwen-max (文本)
                      </p>
                    </div>
                  </div>
                </>
              ) : activeTab === 'prompts' ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-gray-700">1. 选择模型厂商</label>
                      <div className="flex gap-2">
                        {(['gemini', 'doubao', 'qwen'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setPromptProvider(p)}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-xl border-2 transition-all font-bold text-xs capitalize",
                              promptProvider === p ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-100 bg-gray-50 text-gray-500"
                            )}
                          >
                            {p === 'gemini' ? 'Gemini' : p === 'doubao' ? '豆包' : '千问'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-bold text-gray-700">2. 选择任务阶段</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['allInOne', 'attributesOnly', 'titleOnly', 'naming'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setPromptType(t)}
                            className={cn(
                              "py-2 px-3 rounded-xl border-2 transition-all font-bold text-[10px]",
                              promptType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-100 bg-gray-50 text-gray-500"
                            )}
                          >
                            {t === 'allInOne' ? '一键生成(标题+品名)' :
                             t === 'naming' ? '仅起名' : 
                             t === 'attributesOnly' ? '仅属性识别' : '仅生成标题'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Sparkles size={16} className="text-pink-500" />
                          自定义系统提示词 / 起名规则
                        </label>
                        <button 
                          onClick={() => {
                            setCustomPrompts((prev: any) => ({
                              ...prev,
                              [promptType]: {
                                ...prev[promptType],
                                [promptProvider]: DEFAULT_PROMPTS[promptType][promptProvider]
                              }
                            }));
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          恢复默认
                        </button>
                      </div>
                      <textarea 
                        value={customPrompts[promptType][promptProvider]}
                        onChange={(e) => {
                          setCustomPrompts((prev: any) => ({
                            ...prev,
                            [promptType]: {
                              ...prev[promptType],
                              [promptProvider]: e.target.value
                            }
                          }));
                        }}
                        className="w-full h-[300px] p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-scrollbar"
                        placeholder="在此输入自定义提示词..."
                      />
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                        <p className="text-[10px] text-orange-700 leading-relaxed">
                          <span className="font-bold">提示：</span>请保留提示词中的占位符（如 <code className="bg-orange-100 px-1 rounded">{"{{category}}"}</code>, <code className="bg-orange-100 px-1 rounded">{"{{minLen}}"}</code> 等），系统会自动替换为实际数据。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <h3 className="text-sm font-bold text-blue-900 mb-2">批量更换提示词接口</h3>
                    <p className="text-[10px] text-blue-700 leading-relaxed mb-4">
                      您可以在此处直接粘贴完整的提示词 JSON 配置进行批量更换。
                      <br />
                      <span className="font-bold text-red-600">注意：</span> 点击“应用并覆盖当前设置”后，当前所有的自定义提示词将被替换为下方 JSON 中的内容。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700">JSON 配置内容</label>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(bulkJson);
                          setTestStatus(prev => ({ ...prev, bulk_copy: 'success' }));
                          setTimeout(() => setTestStatus(prev => ({ ...prev, bulk_copy: 'idle' })), 2000);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        {testStatus['bulk_copy'] === 'success' ? '已复制' : '复制当前配置'}
                      </button>
                    </div>
                    <textarea 
                      value={bulkJson}
                      onChange={(e) => setBulkJson(e.target.value)}
                      className="w-full h-[350px] p-4 bg-gray-900 text-green-400 border border-gray-800 rounded-2xl text-[10px] font-mono leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 transition-all custom-scrollbar"
                      placeholder="请粘贴提示词 JSON 配置..."
                    />
                    {testStatus['bulk'] === 'error' && (
                      <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
                        {testError['bulk']}
                      </p>
                    )}
                    <button 
                      onClick={handleApplyBulkJson}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm",
                        testStatus['bulk'] === 'success' 
                          ? "bg-green-600 text-white" 
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      {testStatus['bulk'] === 'success' ? (
                        <>
                          <CheckCircle2 size={18} />
                          已成功应用并更新设置
                        </>
                      ) : (
                        <>
                          <Play size={18} />
                          应用并覆盖当前设置
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      <span className="font-bold underline">永久保存提示词到代码：</span>
                      <br />
                      如果您希望将这些提示词作为系统的 <span className="font-bold">默认设置（代码级修改）</span>，请在点击“应用”后，将该 JSON 粘贴给 AI 助手，并告知：“请将这些内容更新为 src/services/prompts.ts 中的默认提示词”，AI 将为您完成源码更新。
                    </p>
                  </div>
                </div>
              )}
            </div>


            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
              >
                保存并关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
