import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Download, 
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from './lib/utils';
import { extractAttributesOnly, generateTitlesOnly, generateProductNamesOnly, AttributeDefinition, LLMConfig } from './services/llmService';
import { DEFAULT_PROMPTS } from './services/prompts';
import {
  DEFAULT_FEATURE_MODELS,
  FEATURE_LABELS,
  FEATURE_ORDER,
  FeatureKey,
  getModelById
} from './data/openrouterModels';

import { SettingsModal } from './components/SettingsModal';
import { HistoryPanel } from './components/HistoryPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImageUploader } from './components/ImageUploader';
import { CategorySelector } from './components/CategorySelector';
import { RightSidebar } from './components/RightSidebar';
import { AttributeList } from './components/AttributeList';
import { ResultDisplay } from './components/ResultDisplay';
import { ParsedCSVRow } from './types';

import { DEFAULT_ATTRIBUTE_LIBRARY } from './data/attributeLibrary';

const safeJSONParse = (val: string | null, fallback: any) => {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    console.error("Failed to parse JSON from localStorage", e);
    return fallback;
  }
};

const normalizeFeatureModels = (stored: Partial<Record<FeatureKey, string>> = {}): Record<FeatureKey, string> => {
  const merged = { ...DEFAULT_FEATURE_MODELS, ...stored };
  const normalized = { ...merged };

  for (const feature of FEATURE_ORDER) {
    const modelInfo = getModelById(normalized[feature]);
    if (!modelInfo || (feature === 'attributesOnly' && !modelInfo.supportsVision)) {
      normalized[feature] = DEFAULT_FEATURE_MODELS[feature];
    }
  }

  return normalized;
};

const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Use jpeg with 0.7 quality to significantly reduce size
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn(`LocalStorage quota exceeded for key: ${key}`);
      
      // If it's the current image, it's likely very large. 
      // We try to clear history first.
      const historyStr = localStorage.getItem('fashion_history');
      if (historyStr) {
        try {
          const history = JSON.parse(historyStr);
          if (history.length > 0) {
            // Remove half of history to make significant room
            localStorage.setItem('fashion_history', JSON.stringify(history.slice(Math.ceil(history.length / 2))));
            try {
              localStorage.setItem(key, value);
              return;
            } catch (retryErr) {
              // Still failing, try clearing all history
              localStorage.removeItem('fashion_history');
              try {
                localStorage.setItem(key, value);
                return;
              } catch (finalErr) {
                // If it still fails, it's just too big for localStorage
                console.error("Image too large for LocalStorage even after clearing history.");
              }
            }
          }
        } catch (pErr) {
          localStorage.removeItem('fashion_history');
        }
      }
    } else {
      console.error("Failed to set item in localStorage", e);
    }
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [csvData, setCsvData] = useState<ParsedCSVRow[]>(() => {
    const saved = localStorage.getItem('fashion_csv_data');
    if (saved) return safeJSONParse(saved, DEFAULT_ATTRIBUTE_LIBRARY);
    return DEFAULT_ATTRIBUTE_LIBRARY;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const saved = localStorage.getItem('fashion_selected_category');
    if (saved) return saved;
    return DEFAULT_ATTRIBUTE_LIBRARY[0]?.category || '';
  });
  const [categoryKeywords, setCategoryKeywords] = useState<Record<string, string>>(() => safeJSONParse(localStorage.getItem('fashion_category_keywords'), {}));
  const [image, setImage] = useState<string | null>(() => localStorage.getItem('fashion_current_image'));
  const [imageName, setImageName] = useState<string>(() => localStorage.getItem('fashion_image_name') || '');
  const [extractedData, setExtractedData] = useState<Record<string, string>>(() => safeJSONParse(localStorage.getItem('fashion_extracted_data'), {}));
  const [generatedTitle, setGeneratedTitle] = useState<string>(() => localStorage.getItem('fashion_generated_title') || '');
  const [generatedSubtitle, setGeneratedSubtitle] = useState<string>(() => localStorage.getItem('fashion_generated_subtitle') || '');
  const [generatedProductName, setGeneratedProductName] = useState<string>(() => localStorage.getItem('fashion_generated_product_name') || '');
  const [generatedProductNames, setGeneratedProductNames] = useState<string[]>(() => safeJSONParse(localStorage.getItem('fashion_generated_product_names'), []));
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [namingFeedback, setNamingFeedback] = useState<string>(() => localStorage.getItem('fashion_naming_feedback') || '');
  const [nameRatings, setNameRatings] = useState<Record<string, '优' | '良' | '中' | '差'>>(() => safeJSONParse(localStorage.getItem('fashion_name_ratings'), {}));
  const [requiredAttributes, setRequiredAttributes] = useState<Record<string, string[]>>(() => safeJSONParse(localStorage.getItem('fashion_required_attributes'), {}));
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStage, setExtractionStage] = useState<'idle' | 'extracting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // OpenRouter configuration
  const [openrouterKey, setOpenrouterKey] = useState(() => localStorage.getItem('openrouter_key') || localStorage.getItem('openai_key') || '');
  const [featureModels, setFeatureModels] = useState<Record<FeatureKey, string>>(() => normalizeFeatureModels(
    safeJSONParse(localStorage.getItem('fashion_feature_models'), {})
  ));
  const [selectedTasks, setSelectedTasks] = useState<Record<FeatureKey, boolean>>(() => ({
    attributesOnly: true,
    titleOnly: false,
    naming: false,
    ...safeJSONParse(localStorage.getItem('fashion_selected_tasks'), {})
  }));
  const [taskStatus, setTaskStatus] = useState<Record<FeatureKey, 'idle' | 'running' | 'success' | 'error'>>({
    attributesOnly: 'idle',
    titleOnly: 'idle',
    naming: 'idle'
  });
  const [taskErrors, setTaskErrors] = useState<Partial<Record<FeatureKey, string>>>({});
  const [minTitleLen, setMinTitleLen] = useState<number>(() => Number(localStorage.getItem('fashion_min_title_len')) || 28);
  const [maxTitleLen, setMaxTitleLen] = useState<number>(() => Number(localStorage.getItem('fashion_max_title_len')) || 30);
  const [showSettings, setShowSettings] = useState(false);
  
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [customPrompts, setCustomPrompts] = useState(() => {
    const saved = localStorage.getItem('fashion_custom_prompts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const migratePrompt = (key: keyof typeof DEFAULT_PROMPTS) => {
          const value = parsed?.[key];
          if (typeof value === 'string') return value;
          return DEFAULT_PROMPTS[key];
        };

        return {
          attributesOnly: migratePrompt('attributesOnly'),
          titleOnly: migratePrompt('titleOnly'),
          naming: migratePrompt('naming')
        };
      } catch {
        return { ...DEFAULT_PROMPTS };
      }
    }
    return { ...DEFAULT_PROMPTS };
  });

  useEffect(() => {
    localStorage.setItem('fashion_custom_prompts', JSON.stringify(customPrompts));
  }, [customPrompts]);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [currentAttemptingModel, setCurrentAttemptingModel] = useState<string>('');

  const [history, setHistory] = useState<Array<{ category: string; data: Record<string, string>; title: string; subtitle: string; productName?: string }>>(() => {
    const saved = localStorage.getItem('fashion_history');
    return safeJSONParse(saved, []);
  });

  useEffect(() => {
    localStorage.setItem('openrouter_key', openrouterKey);
  }, [openrouterKey]);
  useEffect(() => {
    safeLocalStorageSet('fashion_feature_models', JSON.stringify(featureModels));
  }, [featureModels]);
  useEffect(() => {
    safeLocalStorageSet('fashion_selected_tasks', JSON.stringify(selectedTasks));
  }, [selectedTasks]);
  useEffect(() => {
    const normalized = normalizeFeatureModels(featureModels);
    if (FEATURE_ORDER.some(feature => normalized[feature] !== featureModels[feature])) {
      setFeatureModels(normalized);
    }
  }, [featureModels]);

  useEffect(() => {
    localStorage.setItem('fashion_generated_product_name', generatedProductName);
  }, [generatedProductName]);

  useEffect(() => {
    localStorage.setItem('fashion_generated_product_names', JSON.stringify(generatedProductNames));
  }, [generatedProductNames]);

  useEffect(() => {
    localStorage.setItem('fashion_naming_feedback', namingFeedback);
  }, [namingFeedback]);

  useEffect(() => {
    localStorage.setItem('fashion_min_title_len', minTitleLen.toString());
  }, [minTitleLen]);

  useEffect(() => {
    localStorage.setItem('fashion_max_title_len', maxTitleLen.toString());
  }, [maxTitleLen]);

  useEffect(() => {
    localStorage.setItem('fashion_name_ratings', JSON.stringify(nameRatings));
  }, [nameRatings]);

  const historyInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    safeLocalStorageSet('fashion_category_keywords', JSON.stringify(categoryKeywords));
  }, [categoryKeywords]);

  useEffect(() => {
    safeLocalStorageSet('fashion_csv_data', JSON.stringify(csvData));
  }, [csvData]);

  useEffect(() => {
    const saveHistory = (data: any[]) => {
      try {
        localStorage.setItem('fashion_history', JSON.stringify(data));
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn("LocalStorage quota exceeded for history, pruning oldest item...");
          if (data.length > 0) {
            // Remove the oldest item and update state
            const pruned = data.slice(1);
            setHistory(pruned);
          } else {
            // If even empty history fails, something else is taking up all space
            localStorage.removeItem('fashion_history');
          }
        }
      }
    };
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    safeLocalStorageSet('fashion_selected_category', selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (image) safeLocalStorageSet('fashion_current_image', image);
    else localStorage.removeItem('fashion_current_image');
  }, [image]);

  useEffect(() => {
    safeLocalStorageSet('fashion_image_name', imageName);
  }, [imageName]);

  useEffect(() => {
    safeLocalStorageSet('fashion_extracted_data', JSON.stringify(extractedData));
  }, [extractedData]);

  useEffect(() => {
    safeLocalStorageSet('fashion_generated_title', generatedTitle);
  }, [generatedTitle]);

  useEffect(() => {
    safeLocalStorageSet('fashion_generated_subtitle', generatedSubtitle);
  }, [generatedSubtitle]);

  useEffect(() => {
    safeLocalStorageSet('fashion_required_attributes', JSON.stringify(requiredAttributes));
  }, [requiredAttributes]);

  const getCharCount = (str: string) => {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) > 255) {
        count += 1;
      } else {
        count += 0.5;
      }
    }
    return count;
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
          
          // Store the filename for pasted images if available
          const nameWithoutExt = blob.name ? blob.name.replace(/\.[^/.]+$/, "") : `pasted_${new Date().getTime()}`;
          setImageName(nameWithoutExt);
          
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const compressed = await compressImage(base64);
            setImage(compressed);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(csvData.map(row => row.category)));
  }, [csvData]);

  const currentAttributes = useMemo(() => {
    const attrs = csvData.filter(row => row.category === selectedCategory);
    // Sort "货号" or similar to the top
    return [...attrs].sort((a, b) => {
      const isA = a.attribute.includes('货号') || a.attribute.includes('款号');
      const isB = b.attribute.includes('货号') || b.attribute.includes('款号');
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
      return 0;
    });
  }, [csvData, selectedCategory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        processFileData(data);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, {
        complete: (results) => {
          processFileData(results.data);
        },
        header: false,
        skipEmptyLines: true
      });
    }
  };

  const processFileData = (data: any[]) => {
    let lastCategory = '';
    const parsed: ParsedCSVRow[] = data
      .slice(1) // Skip header
      .map((row: any) => {
        const cat = row[0]?.toString().trim();
        if (cat && cat !== '') {
          lastCategory = cat;
        }
        return {
          category: lastCategory,
          attribute: row[1]?.toString().trim(),
          options: row.slice(2).filter((opt: any) => opt && opt.toString().trim() !== '')
        };
      })
      .filter((row: any) => row.category && row.attribute);
    
    if (parsed.length === 0) {
      setError("File format incorrect or empty. Expected: Category, Attribute, Option1, Option2...");
      return;
    }
    
    setCsvData(parsed);
    setError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store the filename, but don't fill "货号" yet
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setImageName(nameWithoutExt);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressImage(base64);
      setImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const getLLMConfig = (feature: FeatureKey): LLMConfig | null => {
    if (!openrouterKey) {
      setError("请在系统设置中填写 OpenRouter API Key");
      setShowSettings(true);
      return null;
    }

    const modelId = featureModels[feature] || DEFAULT_FEATURE_MODELS[feature];
    const modelInfo = getModelById(modelId);
    return {
      provider: 'openai',
      apiKey: '',
      model: modelId,
      openrouterKey,
      openrouterModel: modelId,
      supportsVision: modelInfo?.supportsVision,
      onWarning: (msg) => setWarnings(prev => prev.includes(msg) ? prev : [...prev, msg]),
      onModelChange: (model) => setCurrentAttemptingModel(model),
      customPrompts
    };
  };

  const buildFinalAttributes = (attributes: Record<string, string>) => {
    const currentRequired = requiredAttributes[selectedCategory] || [];
    const finalAttributes: Record<string, string> = {};
    currentRequired.forEach(attr => {
      if (attributes[attr]) finalAttributes[attr] = attributes[attr];
    });

    const itemNoAttr = currentAttributes.find(a => a.attribute === '货号' || a.attribute === '商品货号' || a.attribute === '款号');
    if (itemNoAttr && imageName) {
      finalAttributes[itemNoAttr.attribute] = imageName;
    }

    return finalAttributes;
  };

  const runAttributesTask = async () => {
    if (!image || !selectedCategory) throw new Error('请先上传图片并选择类目');
    const modelInfo = getModelById(featureModels.attributesOnly);
    if (!modelInfo?.supportsVision) {
      throw new Error('属性识别模型必须支持图片，请更换支持图片的模型');
    }
    const llmConfig = getLLMConfig('attributesOnly');
    if (!llmConfig) throw new Error('请先填写 OpenRouter API Key');

    const currentRequired = requiredAttributes[selectedCategory] || [];
    const attributes = await extractAttributesOnly(
      image,
      selectedCategory,
      currentAttributes,
      currentRequired,
      llmConfig
    );
    const finalAttributes = buildFinalAttributes(attributes);
    setExtractedData(finalAttributes);
    return finalAttributes;
  };

  const runTitlesTask = async (attributesForTitle: Record<string, string>) => {
    if (!image || !selectedCategory) throw new Error('请先上传图片并选择类目');
    if (Object.keys(attributesForTitle).length === 0) {
      throw new Error('标题生成需要先有 attributes：请勾选属性识别，或先完成属性识别。');
    }
    const llmConfig = getLLMConfig('titleOnly');
    if (!llmConfig) throw new Error('请先填写 OpenRouter API Key');

    const currentHotKeywords = categoryKeywords[selectedCategory] || '';
    const result = await generateTitlesOnly(
      image,
      selectedCategory,
      attributesForTitle,
      currentHotKeywords,
      llmConfig,
      [minTitleLen, maxTitleLen]
    );
    setGeneratedTitle(result.title);
    setGeneratedSubtitle(result.subtitle);
  };

  const runNamesTask = async () => {
    if (!image || !selectedCategory) throw new Error('请先上传图片并选择类目');
    const llmConfig = getLLMConfig('naming');
    if (!llmConfig) throw new Error('请先填写 OpenRouter API Key');

    let names = await generateProductNamesOnly(image, selectedCategory, llmConfig, namingFeedback);
    if (names.length === 0) {
      names = await generateProductNamesOnly(image, selectedCategory, llmConfig, namingFeedback);
    }
    if (names.length === 0) throw new Error('商品起名没有返回候选名称，请重试或切换模型');
    setGeneratedProductNames(names);
    if (names.length > 0) setGeneratedProductName(names[0]);
  };

  const getLLMErrorMessage = (err: any) => {
    const errorMessage = err?.message || "";
    const errorStatus = err?.status || err?.error?.status || err?.code || err?.error?.code;

    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorStatus === 429 || errorStatus === 'RESOURCE_EXHAUSTED') {
      return "AI 接口调用次数超限 (Rate Limit Exceeded)。请稍等几秒钟后再试，或者检查您的 API 配额。";
    }
    if (errorMessage.includes('API Key') || errorMessage.includes('OpenRouter API Key')) {
      return errorMessage;
    }
    return errorMessage || "AI 调用失败。请检查网络连接或重试。";
  };

  const runSingleTask = async (feature: FeatureKey) => {
    let attributesForTitle = extractedData;
    if (feature === 'attributesOnly') {
      await runAttributesTask();
    } else if (feature === 'titleOnly') {
      await runTitlesTask(attributesForTitle);
    } else {
      await runNamesTask();
    }
  };

  const handleRunSelectedTasks = async () => {
    if (!image || !selectedCategory || isExtracting) return;
    const tasksToRun = FEATURE_ORDER.filter(feature => selectedTasks[feature]);
    if (tasksToRun.length === 0) {
      setError('请至少勾选一个功能');
      return;
    }

    setWarnings([]);
    setIsExtracting(true);
    setExtractionStage('extracting');
    setError(null);
    setCurrentAttemptingModel('');
    setTaskErrors({});
    setTaskStatus({ attributesOnly: 'idle', titleOnly: 'idle', naming: 'idle' });

    let attributesForTitle = extractedData;
    const failures: Partial<Record<FeatureKey, string>> = {};
    try {
      for (const feature of FEATURE_ORDER) {
        if (!selectedTasks[feature]) continue;
        setTaskStatus(prev => ({ ...prev, [feature]: 'running' }));
        try {
          if (feature === 'attributesOnly') {
            attributesForTitle = await runAttributesTask();
          } else if (feature === 'titleOnly') {
            await runTitlesTask(attributesForTitle);
          } else {
            await runNamesTask();
          }
          setTaskStatus(prev => ({ ...prev, [feature]: 'success' }));
        } catch (err: any) {
          const message = getLLMErrorMessage(err);
          failures[feature] = message;
          setTaskErrors(prev => ({ ...prev, [feature]: message }));
          setTaskStatus(prev => ({ ...prev, [feature]: 'error' }));
          console.error(`${FEATURE_LABELS[feature]} failed:`, err);
        }
      }

      if (Object.keys(failures).length > 0) {
        setError(
          Object.entries(failures)
            .map(([feature, message]) => `${FEATURE_LABELS[feature as FeatureKey]}失败：${message}`)
            .join('；')
        );
      }
      setExtractionStage('success');
      setTimeout(() => setExtractionStage('idle'), 2000);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFeatureAction = async (feature: FeatureKey) => {
    if (!image || !selectedCategory || isExtracting) return;
    setWarnings([]);
    setIsExtracting(true);
    setExtractionStage('extracting');
    setError(null);
    setCurrentAttemptingModel('');
    setTaskErrors({});
    setTaskStatus(prev => ({ ...prev, [feature]: 'running' }));

    try {
      await runSingleTask(feature);
      setTaskStatus(prev => ({ ...prev, [feature]: 'success' }));
      setExtractionStage('success');
      setTimeout(() => setExtractionStage('idle'), 2000);
    } catch (err: any) {
      setTaskStatus(prev => ({ ...prev, [feature]: 'error' }));
      setTaskErrors(prev => ({ ...prev, [feature]: getLLMErrorMessage(err) }));
      handleLLMError(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractAttributes = () => handleFeatureAction('attributesOnly');
  const handleGenerateTitles = () => handleFeatureAction('titleOnly');
  const handleGenerateNames = () => handleFeatureAction('naming');

  const handleLLMError = (err: any) => {
    const message = getLLMErrorMessage(err);
    if (message.includes('API Key') || message.includes('OpenRouter API Key')) {
      setError(message);
      setShowSettings(true);
    } else {
      setError(message);
    }
    setExtractionStage('idle');
    console.error("LLM error:", err);
  };

  const handleSave = () => {
    if (Object.keys(extractedData).length === 0) return;
    setHistory(prev => {
      const newItem = { 
        category: selectedCategory, 
        data: { ...extractedData }, 
        title: generatedTitle, 
        subtitle: generatedSubtitle,
        productName: generatedProductName
      };
      const next = [...prev, newItem];
      // Limit history to last 100 items (images are removed, so we can store more)
      return next.slice(-100);
    });
    // Reset for next
    clearCurrentState();
  };

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const handleCopyAllNames = () => {
    if (generatedProductNames.length === 0) return;
    const allNames = generatedProductNames.join('\n');
    navigator.clipboard.writeText(allNames);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleRegenerateNames = async () => {
    if (!image || !selectedCategory || isExtracting) return;
    
    setWarnings([]);
    setIsExtracting(true);
    setExtractionStage('extracting');
    
    setCurrentAttemptingModel('');
    try {
      const llmConfig = getLLMConfig('naming');
      if (!llmConfig) return;
      const names = await generateProductNamesOnly(image, selectedCategory, llmConfig, namingFeedback);
      setGeneratedProductNames(names);
      if (names.length > 0) {
        setGeneratedProductName(names[0]);
      }
      setExtractionStage('success');
      setTimeout(() => setExtractionStage('idle'), 2000);
    } catch (err) {
      console.error("Failed to regenerate names:", err);
      setError("重新生成品名失败，请重试");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRateName = (name: string, rating: '优' | '良' | '中' | '差') => {
    setNameRatings(prev => ({ ...prev, [name]: rating }));
    
    const feedbackEntry = `[品名: ${name}, 评分: ${rating}]`;
    setNamingFeedback(prev => {
      // Keep last 50 feedbacks for better long-term memory
      const current = prev ? prev.split('; ').slice(-50) : [];
      // Avoid duplicate entries for the same name in the prompt
      const filtered = current.filter(entry => !entry.includes(`品名: ${name}`));
      return [...filtered, feedbackEntry].join('; ');
    });
    setGeneratedProductName(name);
  };

  const clearCurrentState = () => {
    setImage(null);
    setImageName('');
    setExtractedData({});
    setGeneratedTitle('');
    setGeneratedSubtitle('');
    setGeneratedProductName('');
    setGeneratedProductNames([]);
  };

  const toggleRequired = (attrName: string) => {
    if (!selectedCategory) return;
    setRequiredAttributes(prev => {
      const current = prev[selectedCategory] || [];
      const next = current.includes(attrName)
        ? current.filter(a => a !== attrName)
        : [...current, attrName];
      return { ...prev, [selectedCategory]: next };
    });
  };

  const clearAll = () => {
    clearCurrentState();
    setHistory([]);
    localStorage.removeItem('fashion_history');
    localStorage.removeItem('fashion_current_image');
    localStorage.removeItem('fashion_extracted_data');
    localStorage.removeItem('fashion_generated_title');
    localStorage.removeItem('fashion_generated_subtitle');
  };

  const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    const processData = (data: any[]) => {
      if (data.length < 2) return;
      const headers = data[0];
      const rows = data.slice(1);

      // Try to find indices based on common names
      const categoryIdx = headers.findIndex((h: string) => h === '大类目' || h === 'Category');
      const titleIdx = headers.findIndex((h: string) => h === '抖音主标题' || h === 'Main Title');
      const subtitleIdx = headers.findIndex((h: string) => h === '副标题' || h === 'Subtitle');
      const itemNoIdx = headers.findIndex((h: string) => ['货号', '商品货号', '款号'].includes(h));

      // Attributes are anything that isn't category, title, or subtitle
      const excludedIndices = [categoryIdx, titleIdx, subtitleIdx].filter(i => i !== -1);

      const newHistory = rows.map(row => {
        const extractedAttrs: Record<string, string> = {};
        headers.forEach((header: string, i: number) => {
          if (header && !excludedIndices.includes(i) && row[i] !== undefined) {
            extractedAttrs[header] = row[i].toString();
          }
        });

        return {
          category: categoryIdx !== -1 ? (row[categoryIdx] || '') : '',
          title: titleIdx !== -1 ? (row[titleIdx] || '') : '',
          subtitle: subtitleIdx !== -1 ? (row[subtitleIdx] || '') : '',
          data: extractedAttrs
        };
      }).filter(h => h.category || h.title);

      setHistory(prev => [...prev, ...newHistory].slice(-100));
    };

    if (fileExtension === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        processData(data);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, {
        complete: (results) => {
          processData(results.data);
        },
        header: false
      });
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const exportToCSV = () => {
    if (history.length === 0) return;

    // Get all unique attributes across all history items
    const allAttributes: string[] = Array.from(new Set(history.flatMap(h => Object.keys(h.data))));
    
    // Find the item number key
    const itemNoKeys = ['货号', '商品货号', '款号'];
    const foundItemNoKey = allAttributes.find(a => itemNoKeys.some(k => a.includes(k))) || '货号';
    
    // Filter out item number from other attributes to avoid duplication in the middle
    const otherAttributes = allAttributes.filter(a => !itemNoKeys.some(k => a.includes(k)));
    
    const headers = [foundItemNoKey, '大类目', '抖音主标题', '副标题', ...otherAttributes];
    
    const rows = history.map(h => {
      // Find the value for the item number
      const itemNoValue = h.data[foundItemNoKey] || 
                         h.data['货号'] || 
                         h.data['商品货号'] || 
                         h.data['款号'] || '';
                         
      return [
        itemNoValue,
        h.category,
        h.title,
        h.subtitle,
        ...otherAttributes.map(attr => h.data[attr] || '')
      ];
    });

    const csvContent = Papa.unparse({
      fields: headers,
      data: rows
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `extracted_fashion_attributes_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clear history after export as requested
    setHistory([]);
    localStorage.removeItem('fashion_history');
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const modelSummary = FEATURE_ORDER
    .map(feature => `${FEATURE_LABELS[feature]} ${getModelById(featureModels[feature])?.displayName || featureModels[feature]}`)
    .join(' / ');

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top Section: Title & Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Sparkles size={24} />
                </div>
                Fashion AI <span className="text-blue-600">Studio</span>
              </h1>
              <p className="text-gray-500 mt-2 font-medium">智能大码女装属性提取与文案生成系统</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Current Model Display */}
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">当前 AI 模型</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isExtracting ? "bg-green-500 animate-pulse" : "bg-blue-500")} />
                    <span className="text-xs font-black text-gray-700 max-w-[360px] truncate">
                      {currentAttemptingModel || modelSummary}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={Object.keys(extractedData).length === 0}
                className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
              >
                保存到历史
              </button>
              {history.length > 0 && (
                <button 
                  onClick={exportToCSV}
                  className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  <Download size={18} />
                  导出表格 ({history.length})
                </button>
              )}
            </div>
          </div>

          {/* Error & Warning Messages */}
          <>
            {error && (
              <div 
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700"
              >
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <div className="text-sm font-medium">{error}</div>
                <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}
            {warnings.map((w, i) => (
              <div 
                key={i}
                className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-700"
              >
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <div className="text-sm font-medium">{w}</div>
                <button onClick={() => setWarnings(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto hover:bg-amber-100 p-1 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
            ))}
          </>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Input & Controls */}
            <div className="lg:col-span-4 space-y-6">
              <ImageUploader 
                image={image} 
                imageInputRef={imageInputRef} 
                handleImageUpload={handleImageUpload} 
              />
              <CategorySelector 
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categoryKeywords={categoryKeywords}
                setCategoryKeywords={setCategoryKeywords}
                csvData={csvData}
                categories={categories}
                isExtracting={isExtracting}
                image={image}
                selectedTasks={selectedTasks}
                setSelectedTasks={setSelectedTasks}
                featureModels={featureModels}
                setFeatureModels={setFeatureModels}
                handleExtractAttributes={handleExtractAttributes}
                handleGenerateTitles={handleGenerateTitles}
                handleGenerateNames={handleGenerateNames}
                handleRunSelectedTasks={handleRunSelectedTasks}
                extractionStage={extractionStage}
                currentAttemptingModel={currentAttemptingModel}
                taskStatus={taskStatus}
                taskErrors={taskErrors}
              />
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-8 space-y-6">
              <ResultDisplay 
                generatedTitle={generatedTitle}
                generatedSubtitle={generatedSubtitle}
                generatedProductNames={generatedProductNames}
                generatedProductName={generatedProductName}
                setGeneratedProductName={setGeneratedProductName}
                handleRateName={handleRateName}
                nameRatings={nameRatings}
                handleRegenerateNames={handleRegenerateNames}
                handleRegenerateTitles={handleGenerateTitles}
                isExtracting={isExtracting}
                getCharCount={getCharCount}
                minTitleLen={minTitleLen}
                maxTitleLen={maxTitleLen}
              />
              
              <AttributeList 
                attributes={currentAttributes}
                extractedData={extractedData}
                setExtractedData={setExtractedData}
                requiredAttributes={requiredAttributes[selectedCategory] || []}
                toggleRequired={toggleRequired}
              />
            </div>
          </div>

          {/* History Section */}
          <HistoryPanel 
            history={history} 
            setHistory={setHistory} 
            setExtractedData={setExtractedData}
            setGeneratedTitle={setGeneratedTitle}
            setGeneratedSubtitle={setGeneratedSubtitle}
            setSelectedCategory={setSelectedCategory}
            setGeneratedProductName={setGeneratedProductName}
          />
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar 
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        historyInputRef={historyInputRef}
        handleImportHistory={handleImportHistory}
        setShowSettings={setShowSettings}
        historyLength={history.length}
        hasImage={!!image}
        clearAll={clearAll}
        exportToCSV={exportToCSV}
        csvDataLength={csvData.length}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <SettingsModal 
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        openrouterKey={openrouterKey}
        setOpenrouterKey={setOpenrouterKey}
        featureModels={featureModels}
        setFeatureModels={setFeatureModels}
        showOpenrouterKey={showOpenrouterKey}
        setShowOpenrouterKey={setShowOpenrouterKey}
        customPrompts={customPrompts}
        setCustomPrompts={setCustomPrompts}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ccc;
        }
      `}</style>
    </div>
  );
}
