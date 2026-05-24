import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import OpenAI from "openai";
import { DEFAULT_PROMPTS } from "./prompts";

export type LLMProvider = 'gemini' | 'openai' | 'qwen' | 'doubao' | 'auto';

export interface LLMConfig {
  geminiKey?: string;
  openaiKey?: string;
  openaiModel?: string;
  doubaoKey?: string;
  doubaoVisionModel?: string;
  doubaoTextModel?: string;
  doubaoEndpoint?: string;
  qwenKey?: string;
  // For backward compatibility or single provider use
  provider: LLMProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
  onWarning?: (msg: string) => void;
  onModelChange?: (modelName: string) => void;
  customPrompts?: {
    naming?: Record<string, string>;
    attributesOnly?: Record<string, string>;
    titleOnly?: Record<string, string>;
    allInOne?: Record<string, string>;
  };
}

function replacePlaceholders(template: string, data: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(String(value));
  }
  return result;
}

const getGeminiAI = (apiKey: string) => new GoogleGenAI({ apiKey });

const getOpenAIClient = (apiKey: string, baseURL: string) => new OpenAI({
  apiKey,
  baseURL,
  dangerouslyAllowBrowser: true // Required for client-side calls
});

const parseApiError = (error: any, providerName: string): string => {
  const errMsg = error?.message || String(error);
  let reason = errMsg;

  if (errMsg.includes('401') || errMsg.includes('Incorrect API key') || errMsg.includes('API key not valid') || errMsg.includes('invalid_api_key')) {
    reason = "API Key 无效或未授权 (401)";
  } else if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota') || errMsg.includes('insufficient_quota') || errMsg.includes('exhausted')) {
    reason = "调用次数过多、并发超限或余额不足 (429)";
  } else if (errMsg.includes('500') || errMsg.includes('Internal Server Error')) {
    reason = "服务器内部错误 (500)";
  } else if (errMsg.includes('503') || errMsg.includes('Service Unavailable') || errMsg.includes('overloaded')) {
    reason = "服务不可用或服务器过载 (503)";
  } else if (errMsg.includes('fetch failed') || errMsg.includes('NetworkError') || errMsg.includes('ECONNREFUSED') || errMsg.includes('timeout') || errMsg.includes('Failed to fetch')) {
    reason = "网络连接失败、超时或跨域拦截 (Network Error)";
  } else if (errMsg.includes('User location is not supported') || errMsg.includes('FAILED_PRECONDITION')) {
    reason = "当前访问地区不支持该 API (FAILED_PRECONDITION)";
  }

  return `[${providerName}] ${reason}`;
};

const promptProviderFor = (provider: string) => provider === 'openai' ? 'gemini' : provider;

const flattenProductNames = (parsed: any): string[] => {
  if (!parsed.productNames) return [];
  if (Array.isArray(parsed.productNames)) return parsed.productNames;

  return [
    ...(parsed.productNames.sweet || []),
    ...(parsed.productNames.cute || []),
    ...(parsed.productNames.clothing_style || []),
    ...(parsed.productNames.random_length || [])
  ];
};

// Gemini Circuit Breaker Helpers
const checkGeminiCooldown = () => {
  if (typeof window === 'undefined') return;
  const cooldown = parseInt(localStorage.getItem('gemini_cooldown') || '0', 10);
  if (Date.now() < cooldown) {
    const remainingMins = Math.ceil((cooldown - Date.now()) / 60000);
    throw new Error(`Gemini 连续失败三次，已进入冷却保护。请等待 ${remainingMins} 分钟后再试，或在设置中临时清空 Gemini Key 以强制使用其他模型。`);
  }
};

const handleGeminiSuccess = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('gemini_failures', '0');
  localStorage.removeItem('gemini_cooldown');
};

const handleGeminiError = (e: any) => {
  if (typeof window === 'undefined') return;
  let failures = parseInt(localStorage.getItem('gemini_failures') || '0', 10);
  failures++;
  localStorage.setItem('gemini_failures', failures.toString());
  if (failures >= 3) {
    localStorage.setItem('gemini_cooldown', (Date.now() + 5 * 60 * 1000).toString());
  }
};

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Comprehensive 429/Rate Limit detection
      const errorMessage = error?.message || "";
      const errorStatus = error?.status || error?.error?.status || error?.code || error?.error?.code;
      
      // Hard quota errors - do not retry, fail fast so fallback can happen
      const isQuotaError = 
        errorMessage.includes('quota') || 
        errorMessage.includes('insufficient_quota') || 
        errorMessage.includes('balance') || 
        errorMessage.includes('Payment Required') ||
        errorStatus === 402 ||
        errorStatus === 403;

      if (isQuotaError) {
        console.warn(`Quota or balance error detected. Failing fast to trigger fallback.`);
        throw error;
      }

      const isRateLimit = 
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('rate_limit') ||
        errorStatus === 429 || 
        errorStatus === 'RESOURCE_EXHAUSTED';

      if (isRateLimit && i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
}

export interface AttributeDefinition {
  category: string;
  attribute: string;
  options: string[];
}

export interface ExtractionResult {
  attributes: Record<string, string>;
  title: string;
  subtitle: string;
  productNames: string[];
}

async function compressForVision(base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> {
  // If it's already small enough, skip. But we need to check.
  // Since we are in a service, we might not have access to DOM easily if it's SSR, 
  // but this is a client-side React app.
  if (typeof window === 'undefined') return base64Str;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width <= maxWidth && height <= maxHeight) {
        resolve(base64Str);
        return;
      }
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6)); // Lower quality for speed
    };
    img.onerror = () => resolve(base64Str);
  });
}

async function callGeminiVision(imageBase64: string, prompt: string, apiKey: string): Promise<ExtractionResult> {
  const ai = getGeminiAI(apiKey);
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: "models/gemini-2.5-flash",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1] || imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  }));

  console.group(`LLM Extraction Response (gemini)`);
  console.log(response.text);
  console.groupEnd();

  const parsed = JSON.parse(response.text || "{}");
  let productNames: string[] = [];
  if (Array.isArray(parsed.productNames)) {
    productNames = parsed.productNames;
  } else if (parsed.productNames && typeof parsed.productNames === 'object') {
    productNames = [
      ...(parsed.productNames.sweet || []),
      ...(parsed.productNames.cute || []),
      ...(parsed.productNames.clothing_style || []),
      ...(parsed.productNames.random_length || [])
    ];
  }

  return {
    attributes: parsed.attributes || {},
    title: parsed.title || "",
    subtitle: parsed.subtitle || "",
    productNames: productNames
  };
}

async function callOpenAIVision(imageBase64: string, prompt: string, config: { apiKey: string, baseURL: string, model: string, provider: string }): Promise<ExtractionResult> {
  const client = getOpenAIClient(config.apiKey, config.baseURL);
  
  // For Doubao speed optimization, we compress the image even more if it's Doubao
  const finalImage = config.provider === 'doubao' ? await compressForVision(imageBase64, 512, 512) : imageBase64;

  const response = await withRetry(() => client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: finalImage } }
        ],
      },
    ],
  }));

  console.group(`LLM Extraction Response (${config.provider})`);
  console.log(response.choices[0].message.content);
  console.groupEnd();

  let content = response.choices[0].message.content || "{}";
  if (content.includes('```json')) {
    content = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    content = content.split('```')[1].split('```')[0].trim();
  }
  
  const parsed = JSON.parse(content);
  let productNames: string[] = [];
  if (Array.isArray(parsed.productNames)) {
    productNames = parsed.productNames;
  } else if (parsed.productNames && typeof parsed.productNames === 'object') {
    productNames = [
      ...(parsed.productNames.sweet || []),
      ...(parsed.productNames.cute || []),
      ...(parsed.productNames.clothing_style || []),
      ...(parsed.productNames.random_length || [])
    ];
  }

  return {
    attributes: parsed.attributes || {},
    title: parsed.title || "",
    subtitle: parsed.subtitle || "",
    productNames: productNames
  };
}

async function callOpenAIServerless(imageBase64: string | null, prompt: string, config: LLMConfig): Promise<ExtractionResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.openaiKey) {
    headers.Authorization = `Bearer ${config.openaiKey}`;
  }

  const response = await withRetry(async () => {
    const res = await fetch('/.netlify/functions/openai', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'vision', imageBase64, prompt, model: config.openaiModel || 'gpt-4.1-mini' })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `OpenAI 后端调用失败 (${res.status})`);
    }
    return data;
  });

  const parsed = response.result || response;
  return {
    attributes: parsed.attributes || {},
    title: parsed.title || "",
    subtitle: parsed.subtitle || "",
    productNames: flattenProductNames(parsed)
  };
}

export async function extractAttributesOnly(
  imageBase64: string,
  category: string,
  attributes: AttributeDefinition[],
  requiredAttributes: string[],
  config: LLMConfig
): Promise<Record<string, string>> {
  const getPrompt = (provider: string) => {
    const actualProvider = promptProviderFor(provider === 'auto' ? 'gemini' : provider);
    const template = config.customPrompts?.attributesOnly?.[actualProvider] || DEFAULT_PROMPTS.attributesOnly[actualProvider as keyof typeof DEFAULT_PROMPTS.attributesOnly] || DEFAULT_PROMPTS.attributesOnly.gemini;
    
    const attributesList = attributes
      .map(
        (a) =>
          `- ${a.attribute}${requiredAttributes.includes(a.attribute) ? " (MANDATORY)" : " (OPTIONAL)"}: [${a.options.join(", ")}]`
      )
      .join("\n");

    return replacePlaceholders(template, {
      category,
      attributesList
    });
  };

  const errors: string[] = [];

  // 1. Try Gemini
  if (config.provider === 'gemini' || (config.provider === 'auto' && (config.geminiKey || config.apiKey))) {
    if (config.geminiKey || (config.provider === 'gemini' && config.apiKey)) {
      config.onModelChange?.('Gemini');
      try {
        checkGeminiCooldown();
        const ai = getGeminiAI(config.geminiKey || config.apiKey!);
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
          model: "models/gemini-2.5-flash",
          contents: [
            {
              parts: [
                { text: getPrompt('gemini') },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64.split(",")[1] || imageBase64,
                  },
                },
              ],
            },
          ],
          config: { responseMimeType: "application/json" },
        }));
        handleGeminiSuccess();
        const parsed = JSON.parse(response.text || "{}");
        return parsed.attributes || {};
      } catch (e: any) {
        console.warn("Gemini attributes extraction failed...", e);
        const isCooldown = e.message?.includes('冷却保护');
        const errorMsg = isCooldown ? e.message : parseApiError(e, 'Gemini');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`Gemini 调用失败或处于冷却中，已自动切换备选模型。\n原因: ${errorMsg}`);
          if (!isCooldown) handleGeminiError(e);
        } else throw new Error(errorMsg);
      }
    }
  }

  // 2. Try OpenAI via Netlify Function
  if (config.provider === 'openai' || config.provider === 'auto') {
    config.onModelChange?.('OpenAI');
    try {
      const result = await callOpenAIServerless(imageBase64, getPrompt('openai'), config);
      return result.attributes || {};
    } catch (e) {
      console.warn("OpenAI attributes extraction failed...", e);
      const errorMsg = parseApiError(e, 'OpenAI');
      errors.push(errorMsg);
      if (config.provider === 'auto') config.onWarning?.(`OpenAI 后端调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
      else throw new Error(errorMsg);
    }
  }

  // 3. Try Doubao
  if (config.provider === 'doubao' || (config.provider === 'auto' && (config.doubaoKey || config.apiKey))) {
    if (config.doubaoKey || (config.provider === 'doubao' && config.apiKey)) {
      config.onModelChange?.('Doubao');
      try {
        const baseURL = config.doubaoEndpoint || config.baseURL || "https://ark.cn-beijing.volces.com/api/v3";
        const model = config.doubaoVisionModel || "doubao-vision-pro";
        const client = getOpenAIClient(config.doubaoKey || config.apiKey!, baseURL);
        const finalImage = await compressForVision(imageBase64, 512, 512);
        const response = await withRetry(() => client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: getPrompt('doubao') },
                { type: "image_url", image_url: { url: finalImage } }
              ],
            },
          ],
        }));
        let content = response.choices[0].message.content || "{}";
        if (content.includes('```json')) content = content.split('```json')[1].split('```')[0].trim();
        const parsed = JSON.parse(content);
        return parsed.attributes || {};
      } catch (e) {
        console.warn("Doubao attributes extraction failed...", e);
        const errorMsg = parseApiError(e, 'Doubao');
        errors.push(errorMsg);
        if (config.provider === 'auto') config.onWarning?.(`豆包调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
        else throw new Error(errorMsg);
      }
    }
  }

  // 4. Try Qwen
  if (config.provider === 'qwen' || (config.provider === 'auto' && (config.qwenKey || config.apiKey))) {
    if (config.qwenKey || (config.provider === 'qwen' && config.apiKey)) {
      config.onModelChange?.('Qwen');
      try {
        const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        const model = "qwen-vl-plus";
        const client = getOpenAIClient(config.qwenKey || config.apiKey!, baseURL);
        const response = await withRetry(() => client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: getPrompt('qwen') },
                { type: "image_url", image_url: { url: imageBase64 } }
              ],
            },
          ],
        }));
        let content = response.choices[0].message.content || "{}";
        if (content.includes('```json')) content = content.split('```json')[1].split('```')[0].trim();
        const parsed = JSON.parse(content);
        return parsed.attributes || {};
      } catch (e) {
        console.error("Qwen attributes extraction failed.", e);
        const errorMsg = parseApiError(e, 'Qwen');
        errors.push(errorMsg);
        if (config.provider === 'auto') config.onWarning?.(`千问调用失败，已自动尝试其他模型。\n原因: ${errorMsg}`);
        else throw new Error(errorMsg);
      }
    }
  }

  if (errors.length > 0) throw new Error(`模型调用失败详情:\n${errors.join('\n')}`);
  throw new Error("未配置任何有效的模型 API Key。");
}

export async function generateTitlesOnly(
  imageBase64: string,
  category: string,
  attributes: Record<string, string>,
  hotKeywords: string,
  config: LLMConfig,
  titleLengthRange: [number, number] = [28, 30]
): Promise<{ title: string; subtitle: string }> {
  const [minLen, maxLen] = titleLengthRange;
  const getPrompt = (provider: string) => {
    const actualProvider = promptProviderFor(provider === 'auto' ? 'gemini' : provider);
    const template = config.customPrompts?.titleOnly?.[actualProvider] || DEFAULT_PROMPTS.titleOnly[actualProvider as keyof typeof DEFAULT_PROMPTS.titleOnly] || DEFAULT_PROMPTS.titleOnly.gemini;
    
    return replacePlaceholders(template, {
      category,
      attributes: JSON.stringify(attributes),
      hotKeywords,
      minLen,
      maxLen
    });
  };

  const errors: string[] = [];

  // 1. Try Gemini
  if (config.provider === 'gemini' || (config.provider === 'auto' && (config.geminiKey || config.apiKey))) {
    if (config.geminiKey || (config.provider === 'gemini' && config.apiKey)) {
      config.onModelChange?.('Gemini');
      try {
        checkGeminiCooldown();
        const ai = getGeminiAI(config.geminiKey || config.apiKey!);
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
          model: "models/gemini-2.5-flash",
          contents: [
            {
              parts: [
                { text: getPrompt('gemini') },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64.split(",")[1] || imageBase64,
                  },
                },
              ],
            },
          ],
          config: { responseMimeType: "application/json" },
        }));
        handleGeminiSuccess();
        const parsed = JSON.parse(response.text || "{}");
        return { title: parsed.title || "", subtitle: parsed.subtitle || "" };
      } catch (e: any) {
        console.warn("Gemini title generation failed...", e);
        const isCooldown = e.message?.includes('冷却保护');
        const errorMsg = isCooldown ? e.message : parseApiError(e, 'Gemini');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`Gemini 调用失败或处于冷却中，已自动切换备选模型。\n原因: ${errorMsg}`);
          if (!isCooldown) handleGeminiError(e);
        } else throw new Error(errorMsg);
      }
    }
  }

  // 2. Try OpenAI via Netlify Function
  if (config.provider === 'openai' || config.provider === 'auto') {
    config.onModelChange?.('OpenAI');
    try {
      const result = await callOpenAIServerless(imageBase64, getPrompt('openai'), config);
      return { title: result.title || "", subtitle: result.subtitle || "" };
    } catch (e) {
      console.warn("OpenAI title generation failed...", e);
      const errorMsg = parseApiError(e, 'OpenAI');
      errors.push(errorMsg);
      if (config.provider === 'auto') config.onWarning?.(`OpenAI 后端调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
      else throw new Error(errorMsg);
    }
  }

  // 3. Try Doubao
  if (config.provider === 'doubao' || (config.provider === 'auto' && (config.doubaoKey || config.apiKey))) {
    if (config.doubaoKey || (config.provider === 'doubao' && config.apiKey)) {
      config.onModelChange?.('Doubao');
      try {
        const baseURL = config.doubaoEndpoint || config.baseURL || "https://ark.cn-beijing.volces.com/api/v3";
        const model = config.doubaoVisionModel || "doubao-vision-pro";
        const client = getOpenAIClient(config.doubaoKey || config.apiKey!, baseURL);
        const finalImage = await compressForVision(imageBase64, 512, 512);
        const response = await withRetry(() => client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: getPrompt('doubao') },
                { type: "image_url", image_url: { url: finalImage } }
              ],
            },
          ],
        }));
        let content = response.choices[0].message.content || "{}";
        if (content.includes('```json')) content = content.split('```json')[1].split('```')[0].trim();
        const parsed = JSON.parse(content);
        return { title: parsed.title || "", subtitle: parsed.subtitle || "" };
      } catch (e) {
        console.warn("Doubao title generation failed...", e);
        const errorMsg = parseApiError(e, 'Doubao');
        errors.push(errorMsg);
        if (config.provider === 'auto') config.onWarning?.(`豆包调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
        else throw new Error(errorMsg);
      }
    }
  }

  // 4. Try Qwen
  if (config.provider === 'qwen' || (config.provider === 'auto' && (config.qwenKey || config.apiKey))) {
    if (config.qwenKey || (config.provider === 'qwen' && config.apiKey)) {
      config.onModelChange?.('Qwen');
      try {
        const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        const model = "qwen-vl-plus";
        const client = getOpenAIClient(config.qwenKey || config.apiKey!, baseURL);
        const response = await withRetry(() => client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: getPrompt('qwen') },
                { type: "image_url", image_url: { url: imageBase64 } }
              ],
            },
          ],
        }));
        let content = response.choices[0].message.content || "{}";
        if (content.includes('```json')) content = content.split('```json')[1].split('```')[0].trim();
        const parsed = JSON.parse(content);
        return { title: parsed.title || "", subtitle: parsed.subtitle || "" };
      } catch (e) {
        console.error("Qwen title generation failed.", e);
        const errorMsg = parseApiError(e, 'Qwen');
        errors.push(errorMsg);
        if (config.provider === 'auto') config.onWarning?.(`千问调用失败，已自动尝试其他模型。\n原因: ${errorMsg}`);
        else throw new Error(errorMsg);
      }
    }
  }

  if (errors.length > 0) throw new Error(`模型调用失败详情:\n${errors.join('\n')}`);
  throw new Error("未配置任何有效的模型 API Key。");
}

export async function generateProductNamesOnly(
  imageBase64: string,
  category: string,
  config: LLMConfig,
  namingFeedback?: string
): Promise<string[]> {
  const actualProvider = promptProviderFor(config.provider === 'auto' ? 'gemini' : config.provider);
  const template = config.customPrompts?.naming?.[actualProvider] || DEFAULT_PROMPTS.naming[actualProvider as keyof typeof DEFAULT_PROMPTS.naming] || DEFAULT_PROMPTS.naming.gemini;
  
  const prompt = replacePlaceholders(template, {
    category,
    namingFeedback: namingFeedback ? `- USER FEEDBACK ON PREVIOUS NAMES: "${namingFeedback}". Please adjust your naming style based on this feedback.` : ""
  });

  const errors: string[] = [];

  // 1. Try Gemini
  if (config.provider === 'gemini' || (config.provider === 'auto' && (config.geminiKey || config.apiKey))) {
    if (config.geminiKey || (config.provider === 'gemini' && config.apiKey)) {
      config.onModelChange?.('Gemini');
      try {
        checkGeminiCooldown();
        const result = await callGeminiVision(imageBase64, prompt, config.geminiKey || config.apiKey!);
        handleGeminiSuccess();
        return result.productNames;
      } catch (e: any) {
        console.warn("Gemini name generation failed, falling back...", e);
        const isCooldown = e.message?.includes('冷却保护');
        const errorMsg = isCooldown ? e.message : parseApiError(e, 'Gemini');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`Gemini 调用失败或处于冷却中，已自动切换备选模型。\n原因: ${errorMsg}`);
          if (!isCooldown) {
            handleGeminiError(e);
          }
        } else {
          throw new Error(errorMsg);
        }
      }
    }
  }

  // 2. Try OpenAI via Netlify Function
  if (config.provider === 'openai' || config.provider === 'auto') {
    config.onModelChange?.('OpenAI');
    try {
      const result = await callOpenAIServerless(imageBase64, prompt, config);
      return result.productNames;
    } catch (e) {
      console.warn("OpenAI name generation failed, falling back...", e);
      const errorMsg = parseApiError(e, 'OpenAI');
      errors.push(errorMsg);
      if (config.provider === 'auto') {
        config.onWarning?.(`OpenAI 后端调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
      } else {
        throw new Error(errorMsg);
      }
    }
  }

  // 3. Try Doubao
  if (config.provider === 'doubao' || (config.provider === 'auto' && (config.doubaoKey || config.apiKey))) {
    if (config.doubaoKey || (config.provider === 'doubao' && config.apiKey)) {
      config.onModelChange?.('Doubao');
      try {
        const baseURL = config.doubaoEndpoint || config.baseURL || "https://ark.cn-beijing.volces.com/api/v3";
        const model = config.doubaoVisionModel || "doubao-vision-pro";
        const result = await callOpenAIVision(imageBase64, prompt, {
          apiKey: config.doubaoKey || config.apiKey!,
          baseURL,
          model,
          provider: 'doubao'
        });
        return result.productNames;
      } catch (e) {
        console.warn("Doubao name generation failed, falling back...", e);
        const errorMsg = parseApiError(e, 'Doubao');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`豆包调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
        } else {
          throw new Error(errorMsg);
        }
      }
    }
  }

  // 4. Try Qwen
  if (config.provider === 'qwen' || (config.provider === 'auto' && (config.qwenKey || config.apiKey))) {
    if (config.qwenKey || (config.provider === 'qwen' && config.apiKey)) {
      config.onModelChange?.('Qwen');
      try {
        const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        const model = "qwen-vl-plus";
        const result = await callOpenAIVision(imageBase64, prompt, {
          apiKey: config.qwenKey || config.apiKey!,
          baseURL,
          model,
          provider: 'qwen'
        });
        return result.productNames;
      } catch (e) {
        console.error("Qwen name generation failed.", e);
        const errorMsg = parseApiError(e, 'Qwen');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`千问调用失败，已自动尝试其他模型。\n原因: ${errorMsg}`);
        } else {
          throw new Error(errorMsg);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`模型调用失败详情:\n${errors.join('\n')}`);
  }
  
  throw new Error("未配置任何有效的模型 API Key。");
}

export async function generateEverything(
  imageBase64: string,
  category: string,
  attributes: Record<string, string>,
  hotKeywords: string,
  config: LLMConfig,
  titleLengthRange: [number, number] = [28, 30],
  namingFeedback?: string
): Promise<{ title: string; subtitle: string; productNames: string[] }> {
  const [minLen, maxLen] = titleLengthRange;
  const getPrompt = (provider: string) => {
    const actualProvider = promptProviderFor(provider === 'auto' ? 'gemini' : provider);
    const template = config.customPrompts?.allInOne?.[actualProvider] || DEFAULT_PROMPTS.allInOne[actualProvider as keyof typeof DEFAULT_PROMPTS.allInOne] || DEFAULT_PROMPTS.allInOne.gemini;
    
    return replacePlaceholders(template, {
      category,
      attributes: JSON.stringify(attributes),
      hotKeywords,
      minLen,
      maxLen,
      namingFeedback: namingFeedback ? `- USER FEEDBACK ON PREVIOUS NAMES: "${namingFeedback}". Please adjust your naming style based on this feedback.` : ""
    });
  };

  const flattenNames = (parsed: any): string[] => {
    if (!parsed.productNames) return [];
    if (Array.isArray(parsed.productNames)) return parsed.productNames;
    
    // If it's the categorized object structure
    const names: string[] = [];
    const obj = parsed.productNames;
    if (obj.sweet) names.push(...obj.sweet);
    if (obj.cute) names.push(...obj.cute);
    if (obj.clothing_style) names.push(...obj.clothing_style);
    if (obj.random_length) names.push(...obj.random_length);
    return names;
  };

  const errors: string[] = [];

  // 1. Try Gemini
  if (config.provider === 'gemini' || (config.provider === 'auto' && (config.geminiKey || config.apiKey))) {
    if (config.geminiKey || (config.provider === 'gemini' && config.apiKey)) {
      config.onModelChange?.('Gemini');
      try {
        checkGeminiCooldown();
        const ai = getGeminiAI(config.geminiKey || config.apiKey!);
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
          model: "models/gemini-2.5-flash",
          contents: [
            {
              parts: [
                { text: getPrompt('gemini') },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64.split(",")[1] || imageBase64,
                  },
                },
              ],
            },
          ],
          config: { responseMimeType: "application/json" },
        }));
        handleGeminiSuccess();
        const parsed = JSON.parse(response.text || "{}");
        return { 
          title: parsed.title || "", 
          subtitle: parsed.subtitle || "", 
          productNames: flattenNames(parsed)
        };
      } catch (e: any) {
        console.warn("Gemini mixed generation failed...", e);
        const isCooldown = e.message?.includes('冷却保护');
        const errorMsg = isCooldown ? e.message : parseApiError(e, 'Gemini');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`Gemini 调用失败或处于冷却中，已自动切换备选模型。\n原因: ${errorMsg}`);
          if (!isCooldown) handleGeminiError(e);
        } else throw new Error(errorMsg);
      }
    }
  }

  // 2. Try OpenAI via Netlify Function
  if (config.provider === 'openai' || config.provider === 'auto') {
    config.onModelChange?.('OpenAI');
    try {
      const result = await callOpenAIServerless(imageBase64, getPrompt('openai'), config);
      return {
        title: result.title || "",
        subtitle: result.subtitle || "",
        productNames: result.productNames || []
      };
    } catch (e) {
      console.warn("OpenAI mixed generation failed...", e);
      const errorMsg = parseApiError(e, 'OpenAI');
      errors.push(errorMsg);
      if (config.provider === 'auto') {
        config.onWarning?.(`OpenAI 后端调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
      } else throw new Error(errorMsg);
    }
  }

  // 3. Try Doubao
  if (config.provider === 'doubao' || (config.provider === 'auto' && (config.doubaoKey || config.apiKey))) {
    if (config.doubaoKey || (config.provider === 'doubao' && config.apiKey)) {
      config.onModelChange?.('Doubao');
      try {
        const baseURL = config.doubaoEndpoint || config.baseURL || "https://ark.cn-beijing.volces.com/api/v3";
        const model = config.doubaoVisionModel || "doubao-vision-pro";
        const client = getOpenAIClient(config.doubaoKey || config.apiKey!, baseURL);
        const finalImage = await compressForVision(imageBase64, 512, 512);
        const response = await withRetry(() => client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: getPrompt('doubao') },
                { type: "image_url", image_url: { url: finalImage } }
              ],
            },
          ],
          response_format: { type: "json_object" }
        }));
        const parsed = JSON.parse(response.choices[0].message.content || "{}");
        return { 
          title: parsed.title || "", 
          subtitle: parsed.subtitle || "", 
          productNames: flattenNames(parsed)
        };
      } catch (e: any) {
        const errorMsg = parseApiError(e, 'Doubao');
        errors.push(errorMsg);
        if (config.provider === 'auto') {
          config.onWarning?.(`豆包调用失败，已自动切换备选模型。\n原因: ${errorMsg}`);
        } else throw new Error(errorMsg);
      }
    }
  }

  // 4. Try Qwen
  if (config.provider === 'qwen' || (config.provider === 'auto' && (config.qwenKey || config.apiKey))) {
    if (config.qwenKey || (config.provider === 'qwen' && config.apiKey)) {
      config.onModelChange?.('Qwen');
      try {
        const client = getOpenAIClient(config.qwenKey || config.apiKey!, "https://dashscope.aliyuncs.com/compatible-mode/v1");
        const finalImage = await compressForVision(imageBase64, 512, 512);
        const response = await withRetry(() => client.chat.completions.create({
          model: "qwen-vl-max",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: getPrompt('qwen') },
                { type: "image_url", image_url: { url: finalImage } }
              ],
            },
          ],
          response_format: { type: "json_object" }
        }));
        const parsed = JSON.parse(response.choices[0].message.content || "{}");
        return { 
          title: parsed.title || "", 
          subtitle: parsed.subtitle || "", 
          productNames: flattenNames(parsed)
        };
      } catch (e: any) {
        const errorMsg = parseApiError(e, 'Qwen');
        errors.push(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`模型调用失败详情:\n${errors.join('\n')}`);
  }
  
  throw new Error("未配置任何有效的模型 API Key。");
}

export async function testModelConnection(provider: LLMProvider, config: LLMConfig): Promise<boolean> {
  const testPrompt = "Hello, reply with 'ok' if you can read this. Return JSON: {\"status\": \"ok\"}";
  try {
    if (provider === 'gemini') {
      const ai = getGeminiAI(config.geminiKey || config.apiKey);
      const response = await ai.models.generateContent({
        model: "models/gemini-2.5-flash",
        contents: [{ parts: [{ text: testPrompt }] }],
        config: { responseMimeType: "application/json" }
      });
      return !!response.text;
    } else if (provider === 'openai') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.openaiKey) {
        headers.Authorization = `Bearer ${config.openaiKey}`;
      }
      const res = await fetch('/.netlify/functions/openai', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'test', model: config.openaiModel || 'gpt-4.1-mini' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `OpenAI 后端测试失败 (${res.status})`);
      return !!data.ok;
    } else if (provider === 'doubao') {
      const client = getOpenAIClient(config.doubaoKey || config.apiKey, config.doubaoEndpoint || config.baseURL || "https://ark.cn-beijing.volces.com/api/v3");
      const response = await client.chat.completions.create({
        model: config.doubaoTextModel || "doubao-pro-32k",
        messages: [{ role: "user", content: testPrompt }],
        response_format: { type: "json_object" }
      });
      return !!response.choices[0].message.content;
    } else if (provider === 'qwen') {
      const client = getOpenAIClient(config.qwenKey || config.apiKey, "https://dashscope.aliyuncs.com/compatible-mode/v1");
      const response = await client.chat.completions.create({
        model: "qwen-max",
        messages: [{ role: "user", content: testPrompt }],
        response_format: { type: "json_object" }
      });
      return !!response.choices[0].message.content;
    }
    return false;
  } catch (e) {
    console.error(`Test failed for ${provider}:`, e);
    throw e;
  }
}
