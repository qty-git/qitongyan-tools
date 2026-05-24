import React, { useState } from 'react';
import { ChevronDown, ChevronUp, List, Tag, Hash, Box } from 'lucide-react';
import { cn } from '../lib/utils';

interface AttributeListProps {
  attributes: Array<{ attribute: string; options: string[] }>;
  extractedData: Record<string, string>;
  setExtractedData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  requiredAttributes: string[];
  toggleRequired: (attrName: string) => void;
}

export function AttributeList({
  attributes,
  extractedData,
  setExtractedData,
  requiredAttributes,
  toggleRequired
}: AttributeListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (attributes.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <List size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900">详细属性配置</h3>
            <p className="text-[10px] text-gray-500">共 {attributes.length} 项属性，已填写 {Object.keys(extractedData).length} 项</p>
          </div>
        </div>
        <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
          <ChevronDown size={20} className="text-gray-400" />
        </div>
      </button>

      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden",
        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-50 mt-2">
          {attributes.map((attr, idx) => {
            const isRequired = requiredAttributes.includes(attr.attribute);
            const isItemNo = attr.attribute.includes('货号') || attr.attribute.includes('款号');
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  extractedData[attr.attribute] ? "bg-blue-50/30 border-blue-100" : "bg-gray-50 border-gray-100"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                    {isItemNo ? <Hash size={14} className="text-blue-500" /> : <Tag size={14} className="text-gray-400" />}
                    {attr.attribute}
                  </label>
                  <button 
                    onClick={() => toggleRequired(attr.attribute)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold transition-all",
                      isRequired ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    )}
                  >
                    {isRequired ? '必填' : '选填'}
                  </button>
                </div>
                
                <select 
                  value={extractedData[attr.attribute] || ''}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, [attr.attribute]: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">-- 请选择 --</option>
                  {attr.options.map((opt, oIdx) => (
                    <option key={oIdx} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
