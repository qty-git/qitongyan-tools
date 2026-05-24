import React from 'react';
import { Trash2, FileText } from 'lucide-react';

interface HistoryItem {
  category: string;
  data: Record<string, string>;
  title: string;
  subtitle: string;
  productName?: string;
}

interface HistoryPanelProps {
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  setExtractedData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setGeneratedTitle: (title: string) => void;
  setGeneratedSubtitle: (subtitle: string) => void;
  setSelectedCategory: (category: string) => void;
  setGeneratedProductName: (name: string) => void;
}

export function HistoryPanel({ 
  history, 
  setHistory,
  setExtractedData,
  setGeneratedTitle,
  setGeneratedSubtitle,
  setSelectedCategory,
  setGeneratedProductName
}: HistoryPanelProps) {
  if (history.length === 0) return null;

  const handleRestore = (item: HistoryItem) => {
    setSelectedCategory(item.category);
    setExtractedData(item.data);
    setGeneratedTitle(item.title);
    setGeneratedSubtitle(item.subtitle);
    if (item.productName) setGeneratedProductName(item.productName);
  };

  return (
    <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">已保存记录 ({history.length})</h2>
        <button 
          onClick={() => setHistory([])}
          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
        >
          <Trash2 size={14} />
          清空历史
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {history.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => handleRestore(item)}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <FileText size={24} />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900 truncate">{item.category}</p>
                {item.productName && (
                  <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                    {item.productName}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {item.title}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setHistory(prev => prev.filter((_, i) => i !== idx));
              }}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
