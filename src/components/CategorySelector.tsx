import React from 'react';
import { AlertCircle, Loader2, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ParsedCSVRow } from '../types';
import {
  FEATURE_LABELS,
  FEATURE_ORDER,
  FeatureKey,
  ModelRegistryOption,
  formatModelOption,
  getModelGroupsForFeature,
  getModelById
} from '../services/modelRegistryBuilder';

interface CategorySelectorProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categoryKeywords: Record<string, string>;
  setCategoryKeywords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  csvData: ParsedCSVRow[];
  categories: string[];
  isExtracting: boolean;
  image: string | null;
  selectedTasks: Record<FeatureKey, boolean>;
  setSelectedTasks: React.Dispatch<React.SetStateAction<Record<FeatureKey, boolean>>>;
  featureModels: Record<FeatureKey, string>;
  setFeatureModels: React.Dispatch<React.SetStateAction<Record<FeatureKey, string>>>;
  modelRegistry: ModelRegistryOption[];
  modelRegistryLoading: boolean;
  modelRegistryTesting: boolean;
  handleExtractAttributes: () => void;
  handleGenerateTitles: () => void;
  handleGenerateNames: () => void;
  handleRunSelectedTasks: () => void;
  extractionStage: 'idle' | 'extracting' | 'success';
  currentAttemptingModel: string | null;
  taskStatus: Record<FeatureKey, 'idle' | 'running' | 'success' | 'error'>;
  taskErrors: Partial<Record<FeatureKey, string>>;
}

export function CategorySelector({
  selectedCategory,
  setSelectedCategory,
  categoryKeywords,
  setCategoryKeywords,
  csvData,
  categories,
  isExtracting,
  image,
  selectedTasks,
  setSelectedTasks,
  featureModels,
  setFeatureModels,
  modelRegistry,
  modelRegistryLoading,
  modelRegistryTesting,
  handleExtractAttributes,
  handleGenerateTitles,
  handleGenerateNames,
  handleRunSelectedTasks,
  extractionStage,
  currentAttemptingModel,
  taskStatus,
  taskErrors
}: CategorySelectorProps) {
  const allSelected = FEATURE_ORDER.every(feature => selectedTasks[feature]);
  const anySelected = FEATURE_ORDER.some(feature => selectedTasks[feature]);

  const setTaskSelected = (feature: FeatureKey, checked: boolean) => {
    setSelectedTasks(prev => ({ ...prev, [feature]: checked }));
  };

  const setAllSelected = (checked: boolean) => {
    setSelectedTasks({
      attributesOnly: checked,
      titleOnly: checked,
      naming: checked
    });
  };

  const setFeatureModel = (feature: FeatureKey, modelId: string) => {
    setFeatureModels(prev => ({ ...prev, [feature]: modelId }));
  };

  const useRecommendedModels = () => {
    const recommended = FEATURE_ORDER.reduce((acc, feature) => {
      const model = getModelGroupsForFeature(modelRegistry, feature)[0]?.models[0];
      acc[feature] = model?.modelId || featureModels[feature] || '';
      return acc;
    }, {} as Record<FeatureKey, string>);
    setFeatureModels(recommended);
  };

  const quickActions: Array<{ feature: FeatureKey; label: string; onClick: () => void; color: string }> = [
    { feature: 'attributesOnly', label: '只跑属性', onClick: handleExtractAttributes, color: 'text-blue-600 hover:bg-blue-50' },
    { feature: 'titleOnly', label: '只跑标题', onClick: handleGenerateTitles, color: 'text-indigo-600 hover:bg-indigo-50' },
    { feature: 'naming', label: '只跑起名', onClick: handleGenerateNames, color: 'text-purple-600 hover:bg-purple-50' }
  ];

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <CheckCircle2 size={20} className="text-gray-400" />
        2. 设置关键词与类目
      </h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {selectedCategory ? `[${selectedCategory}] 行业热搜词 (自动保存)` : '行业热搜词 (请先选择类目)'}
          </label>
          <textarea 
            value={selectedCategory ? (categoryKeywords[selectedCategory] || '') : ''}
            disabled={!selectedCategory}
            onChange={(e) => {
              if (selectedCategory) {
                setCategoryKeywords(prev => ({ ...prev, [selectedCategory]: e.target.value }));
              }
            }}
            placeholder={selectedCategory ? "请输入该类目的热搜词，用逗号分隔..." : "请先在下方选择大类目..."}
            className={cn(
              "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm min-h-[80px] resize-none",
              !selectedCategory && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">大类目</label>
          {csvData.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-100">
              <p className="text-sm text-gray-500 italic">请先上传属性库 CSV 文件</p>
            </div>
          ) : (
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            >
              <option value="">-- 请选择大类目 --</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">功能勾选</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={useRecommendedModels}
                disabled={modelRegistry.length === 0}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-black flex items-center gap-1.5"
              >
                <Wand2 size={13} />
                {modelRegistryTesting ? '测试中' : '推荐模型'}
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-black text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => setAllSelected(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                全选
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {FEATURE_ORDER.map(feature => {
              const selectedModel = getModelById(modelRegistry, featureModels[feature]);
              const status = taskStatus[feature];
              return (
                <div
                  key={feature}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    selectedTasks[feature] ? "border-blue-100 bg-blue-50/40" : "border-gray-100 bg-gray-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTasks[feature]}
                      onChange={(e) => setTaskSelected(feature, e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-gray-900">{FEATURE_LABELS[feature]}</div>
                          <div className="text-[11px] text-gray-500 truncate">
                            {selectedModel ? formatModelOption(selectedModel) : featureModels[feature] || '等待模型注册表'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {selectedModel && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black",
                              selectedModel.supportsVision ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                            )}>
                              {selectedModel.supportsVision ? '图片' : '文本'}
                            </span>
                          )}
                          {status === 'running' && <Loader2 className="animate-spin text-blue-600" size={15} />}
                          {status === 'success' && <CheckCircle2 className="text-green-600" size={15} />}
                          {status === 'error' && <AlertCircle className="text-red-500" size={15} />}
                        </div>
                      </div>
                      <select
                        value={featureModels[feature]}
                        onChange={(e) => setFeatureModel(feature, e.target.value)}
                        disabled={isExtracting}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xs font-bold disabled:opacity-60"
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
                      {modelRegistryLoading && (
                        <p className="text-xs text-gray-400 font-medium">正在刷新 OpenRouter 模型生态...</p>
                      )}
                      {taskErrors[feature] && (
                        <p className="text-xs text-red-600 font-medium">{FEATURE_LABELS[feature]}失败：{taskErrors[feature]}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            disabled={!image || !selectedCategory || !anySelected || isExtracting}
            onClick={handleRunSelectedTasks}
            className={cn(
              "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm",
              !image || !selectedCategory || !anySelected || isExtracting
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-blue-100"
            )}
          >
            {isExtracting && extractionStage === 'extracting' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            按勾选项生成
          </button>

          <div className="grid grid-cols-3 gap-2">
            {quickActions.map(action => (
              <button
                key={action.feature}
                type="button"
                disabled={!image || !selectedCategory || isExtracting}
                onClick={action.onClick}
                className={cn(
                  "py-2 rounded-lg border border-gray-100 bg-white text-xs font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  action.color
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {isExtracting && (
          <div className="text-center">
            <p className="text-xs text-gray-500 animate-pulse">
              正在处理中...
              {currentAttemptingModel && ` (当前尝试: ${currentAttemptingModel})`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
