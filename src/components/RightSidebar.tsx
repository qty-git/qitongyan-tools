import React from 'react';
import { FileText, Plus, Settings, Trash2, Download, Database, Table, Sliders, Trash, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface RightSidebarProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  historyInputRef: React.RefObject<HTMLInputElement>;
  handleImportHistory: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowSettings: (show: boolean) => void;
  historyLength: number;
  hasImage: boolean;
  clearAll: () => void;
  exportToCSV: () => void;
  csvDataLength: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function RightSidebar({
  fileInputRef,
  handleFileUpload,
  historyInputRef,
  handleImportHistory,
  setShowSettings,
  historyLength,
  hasImage,
  clearAll,
  exportToCSV,
  csvDataLength,
  isOpen,
  setIsOpen
}: RightSidebarProps) {
  return (
    <aside 
      className={cn(
        "bg-white border-l border-gray-200 h-screen sticky top-0 flex flex-col shadow-xl z-20 transition-all duration-300 ease-in-out",
        isOpen ? "w-72" : "w-16"
      )}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-4 top-10 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors z-30"
      >
        <ChevronRight size={16} className={cn("text-gray-600 transition-transform duration-300", isOpen ? "" : "rotate-180")} />
      </button>

      <div className={cn("flex flex-col h-full overflow-hidden", !isOpen && "items-center")}>
        <div className={cn("p-6 border-b border-gray-100", !isOpen && "p-4")}>
          {isOpen ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sliders size={20} className="text-blue-600" />
                控制面板
              </h2>
              <p className="text-xs text-gray-500 mt-1">管理数据与系统配置</p>
            </>
          ) : (
            <Sliders size={24} className="text-blue-600" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {/* Data Management Section */}
          <div className="space-y-4">
            {isOpen && <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">数据管理</h3>}
            
            <div className="space-y-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                title="属性库上传"
                className={cn(
                  "w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all group",
                  isOpen ? "px-4 py-3" : "p-3 justify-center"
                )}
              >
                <div className={cn(
                  "bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-blue-600 transition-colors",
                  isOpen ? "w-10 h-10" : "w-8 h-8"
                )}>
                  <Database size={isOpen ? 20 : 16} />
                </div>
                {isOpen && (
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-700">属性库上传</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[120px]">
                      {csvDataLength > 0 ? `已加载 ${csvDataLength} 条` : 'CSV/XLSX'}
                    </p>
                  </div>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".csv,.xlsx" 
                className="hidden" 
              />

              <button 
                onClick={() => historyInputRef.current?.click()}
                title="导入待导出表"
                className={cn(
                  "w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-green-50 hover:border-green-100 transition-all group",
                  isOpen ? "px-4 py-3" : "p-3 justify-center"
                )}
              >
                <div className={cn(
                  "bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-green-600 transition-colors",
                  isOpen ? "w-10 h-10" : "w-8 h-8"
                )}>
                  <Table size={isOpen ? 20 : 16} />
                </div>
                {isOpen && (
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-700">导入待导出表</p>
                    <p className="text-[10px] text-gray-400">追加历史记录</p>
                  </div>
                )}
              </button>
              <input 
                type="file" 
                ref={historyInputRef} 
                onChange={handleImportHistory} 
                accept=".csv,.xlsx" 
                className="hidden" 
              />
            </div>
          </div>

          {/* System Settings Section */}
          <div className="space-y-4">
            {isOpen && <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">系统配置</h3>}
            
            <button 
              onClick={() => setShowSettings(true)}
              title="模型与提示词"
              className={cn(
                "w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-purple-50 hover:border-purple-100 transition-all group",
                isOpen ? "px-4 py-3" : "p-3 justify-center"
              )}
            >
              <div className={cn(
                "bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:text-purple-600 transition-colors",
                isOpen ? "w-10 h-10" : "w-8 h-8"
              )}>
                <Settings size={isOpen ? 20 : 16} />
              </div>
              {isOpen && (
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-700">模型与提示词</p>
                  <p className="text-[10px] text-gray-400">配置 API Key</p>
                </div>
              )}
            </button>
          </div>

          {/* Actions Section */}
          {(historyLength > 0 || hasImage) && (
            <div className={cn("space-y-4 pt-4 border-t border-gray-100", !isOpen && "flex flex-col items-center")}>
              {isOpen && <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">快捷操作</h3>}
              
              <div className="space-y-2 w-full">
                {historyLength > 0 && (
                  <button 
                    onClick={exportToCSV}
                    title={`导出表格 (${historyLength})`}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200",
                      isOpen ? "py-3" : "p-3"
                    )}
                  >
                    <Download size={18} />
                    {isOpen && `导出 (${historyLength})`}
                  </button>
                )}
                
                <button 
                  onClick={clearAll}
                  title="清空当前状态"
                  className={cn(
                    "w-full flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 transition-all",
                    isOpen ? "py-3" : "p-3"
                  )}
                >
                  <Trash size={18} />
                  {isOpen && "清空状态"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={cn("p-6 bg-gray-50 border-t border-gray-100", !isOpen && "p-4 flex justify-center")}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
              AI
            </div>
            {isOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">Fashion AI v2.0</p>
                <p className="text-[10px] text-gray-500 truncate">Powered by Gemini</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
