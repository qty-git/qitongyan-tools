import React from 'react';
import { ChevronRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { ParsedCSVRow } from '../types';

interface CategorySelectorProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categoryKeywords: Record<string, string>;
  setCategoryKeywords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  csvData: ParsedCSVRow[];
  categories: string[];
  isExtracting: boolean;
  image: string | null;
  handleExtractAttributes: () => void;
  handleGenerateTitles: () => void;
  handleGenerateNames: () => void;
  extractionStage: 'idle' | 'extracting' | 'success';
  currentAttemptingModel: string | null;
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
  handleExtractAttributes,
  handleGenerateTitles,
  handleGenerateNames,
  extractionStage,
  currentAttemptingModel
}: CategorySelectorProps) {
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

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            disabled={!image || !selectedCategory || isExtracting}
            onClick={handleExtractAttributes}
            className={cn(
              "sm:flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm",
              !image || !selectedCategory || isExtracting
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-blue-100"
            )}
          >
            {isExtracting && extractionStage === 'extracting' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            属性识别
          </button>

          <button
            disabled={!image || !selectedCategory || isExtracting}
            onClick={handleGenerateTitles}
            className={cn(
              "sm:flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm",
              !image || !selectedCategory || isExtracting
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-indigo-100"
            )}
          >
            {isExtracting && extractionStage === 'extracting' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            标题生成
          </button>

          <button
            disabled={!image || !selectedCategory || isExtracting}
            onClick={handleGenerateNames}
            className={cn(
              "sm:flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm",
              !image || !selectedCategory || isExtracting
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.98] shadow-purple-100"
            )}
          >
            {isExtracting && extractionStage === 'extracting' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            商品起名
          </button>
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
