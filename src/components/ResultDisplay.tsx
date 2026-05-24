import React, { useState } from 'react';
import { Sparkles, Copy, Check, RefreshCw, Star, Box } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResultDisplayProps {
  generatedTitle: string;
  generatedSubtitle: string;
  generatedProductNames: string[];
  generatedProductName: string;
  setGeneratedProductName: (name: string) => void;
  handleRateName: (name: string, rating: '优' | '良' | '中' | '差') => void;
  nameRatings: Record<string, '优' | '良' | '中' | '差'>;
  handleRegenerateNames: () => void;
  handleRegenerateTitles: () => void;
  isExtracting: boolean;
  getCharCount: (str: string) => number;
  minTitleLen: number;
  maxTitleLen: number;
}

export function ResultDisplay({
  generatedTitle,
  generatedSubtitle,
  generatedProductNames,
  generatedProductName,
  setGeneratedProductName,
  handleRateName,
  nameRatings,
  handleRegenerateNames,
  handleRegenerateTitles,
  isExtracting,
  getCharCount,
  minTitleLen,
  maxTitleLen
}: ResultDisplayProps) {
  const [copiedType, setCopiedType] = useState<'title' | 'subtitle' | 'name' | null>(null);

  const handleCopy = (text: string, type: 'title' | 'subtitle' | 'name') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const titleCount = getCharCount(generatedTitle);
  const subtitleCount = getCharCount(generatedSubtitle);

  return (
    <div className="space-y-6">
      {/* Product Name Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">AI 创意品名</h3>
              <p className="text-[10px] text-gray-500">基于视觉风格生成的 12 个创意候选</p>
            </div>
          </div>
          <button 
            onClick={handleRegenerateNames}
            disabled={isExtracting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-purple-600 disabled:opacity-50"
            title="重新生成"
          >
            <RefreshCw size={18} className={cn(isExtracting && "animate-spin")} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {generatedProductNames.map((name, idx) => {
            const rating = nameRatings[name];
            const isSelected = generatedProductName === name;
            
            return (
              <div 
                key={idx}
                className={cn(
                  "group relative p-3 rounded-2xl border transition-all cursor-pointer",
                  isSelected ? "bg-purple-50 border-purple-200 ring-1 ring-purple-100" : "bg-gray-50 border-gray-100 hover:border-purple-100 hover:bg-white"
                )}
                onClick={() => setGeneratedProductName(name)}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">{name}</span>
                  <div className="flex gap-1">
                    {(['优', '良', '中', '差'] as const).map(r => (
                      <button
                        key={r}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRateName(name, r);
                        }}
                        className={cn(
                          "w-5 h-5 rounded-md text-[8px] font-bold flex items-center justify-center transition-all",
                          rating === r 
                            ? (r === '优' ? "bg-green-500 text-white" : r === '良' ? "bg-blue-500 text-white" : r === '中' ? "bg-yellow-500 text-white" : "bg-red-500 text-white")
                            : "bg-white text-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-sm">
                    <Check size={10} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Titles Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Title */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Star size={16} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">抖音主标题</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                titleCount >= minTitleLen && titleCount <= maxTitleLen ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
              )}>
                {titleCount} 字
              </div>
              <button 
                onClick={handleRegenerateTitles}
                disabled={isExtracting}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-blue-600 disabled:opacity-50"
                title="重新生成标题"
              >
                <RefreshCw size={14} className={cn(isExtracting && "animate-spin")} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative group">
            <textarea 
              value={generatedTitle}
              readOnly
              className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-800 resize-none outline-none"
            />
            <button 
              onClick={() => handleCopy(generatedTitle, 'title')}
              className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-blue-600"
            >
              {copiedType === 'title' ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Box size={16} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">商品副标题</h3>
            </div>
            <div className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full",
              subtitleCount >= 10 && subtitleCount <= 12 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            )}>
              {subtitleCount} 字
            </div>
          </div>
          
          <div className="flex-1 relative group">
            <textarea 
              value={generatedSubtitle}
              readOnly
              className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 resize-none outline-none"
            />
            <button 
              onClick={() => handleCopy(generatedSubtitle, 'subtitle')}
              className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-indigo-600"
            >
              {copiedType === 'subtitle' ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
