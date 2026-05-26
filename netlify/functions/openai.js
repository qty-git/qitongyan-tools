const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const CHAT_COMPLETIONS_URL = `${OPENROUTER_BASE_URL}/chat/completions`;
const MODELS_URL = `${OPENROUTER_BASE_URL}/models`;
const PROJECT_TITLE = "Fashion AI Studio";
const DEFAULT_MODEL = "openrouter/auto";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, HTTP-Referer, X-Title, X-OpenRouter-Title",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  },
  body: JSON.stringify(body)
});

const extractJson = (text = "{}") => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("模型未返回有效 JSON");
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1].trim() : trimmed);
};

const getRequestOrigin = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  if (origin) return origin;

  const referer = event.headers.referer || event.headers.Referer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return referer;
    }
  }

  return process.env.URL || process.env.DEPLOY_PRIME_URL || "https://tranquil-madeleine-38cd80.netlify.app";
};

const getProvider = (model = "") => {
  const prefix = String(model).split("/")[0] || "unknown";
  const labels = {
    openai: "OpenAI",
    google: "Google Gemini",
    anthropic: "Anthropic Claude",
    "x-ai": "xAI Grok",
    deepseek: "DeepSeek",
    moonshotai: "Moonshot Kimi",
    minimax: "MiniMax",
    qwen: "Qwen",
    "meta-llama": "Meta Llama",
    mistralai: "Mistral",
    openrouter: "OpenRouter"
  };
  return labels[prefix] || prefix;
};

const normalizeError = ({ status, message = "", type = "", code = "" }) => {
  const lower = `${message} ${type} ${code}`.toLowerCase();

  if (status === 401) {
    return { type: "invalid_api_key", message: "API Key 无效" };
  }
  if (status === 403 || lower.includes("region") || lower.includes("not available in your region")) {
    return { type: "region_or_model_unavailable", message: "当前地区或模型不可用" };
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
    return { type: "rate_limit", message: "请求频率限制" };
  }
  if (status === 402 || lower.includes("insufficient") || lower.includes("quota") || lower.includes("credit") || lower.includes("balance")) {
    return { type: "insufficient_credits", message: "余额不足或额度不可用" };
  }
  if (status === 404 || lower.includes("not found") || lower.includes("does not exist")) {
    return { type: "model_not_found", message: "模型不存在或已下线" };
  }
  if (lower.includes("provider unavailable") || lower.includes("provider returned error") || lower.includes("no provider") || lower.includes("provider")) {
    return { type: "provider_unavailable", message: "当前模型供应商不可用" };
  }
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("timeout") || lower.includes("econnreset") || lower.includes("enotfound")) {
    return { type: "network_error", message: "网络连接失败" };
  }
  if (lower.includes("cors")) {
    return { type: "cors_blocked", message: "浏览器请求被拦截" };
  }

  return { type: "openrouter_error", message: message || "OpenRouter 请求失败" };
};

const parseOpenRouterBody = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const buildDebug = ({ targetUrl, model, statusCode, responseMessage, success, openrouterReachable, modelResponded, errorType }) => ({
  targetUrl,
  model,
  provider: getProvider(model),
  statusCode: statusCode || null,
  responseMessage: responseMessage || "",
  openrouterReachable: Boolean(openrouterReachable),
  modelResponded: Boolean(modelResponded),
  success: Boolean(success),
  errorType: errorType || ""
});

const openRouterHeaders = (apiKey, origin) => ({
  Authorization: `Bearer ${apiKey}`,
  "HTTP-Referer": origin,
  "X-Title": PROJECT_TITLE,
  "X-OpenRouter-Title": PROJECT_TITLE,
  "Content-Type": "application/json"
});

async function callOpenRouterChat({ apiKey, origin, model, messages, maxTokens = 256 }) {
  const selectedModel = model || DEFAULT_MODEL;
  let response;
  try {
    response = await fetch(CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: openRouterHeaders(apiKey, origin),
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: maxTokens
      })
    });
  } catch (fetchError) {
    const normalized = normalizeError({ message: fetchError?.message || "fetch failed" });
    const error = new Error(normalized.message);
    error.type = normalized.type;
    error.debug = buildDebug({
      targetUrl: CHAT_COMPLETIONS_URL,
      model: selectedModel,
      statusCode: null,
      responseMessage: fetchError?.message || "fetch failed",
      success: false,
      openrouterReachable: false,
      modelResponded: false,
      errorType: normalized.type
    });
    throw error;
  }
  const data = await parseOpenRouterBody(response);
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
  const responseMessage = data.error?.message || data.message || content || response.statusText || "";
  const debug = buildDebug({
    targetUrl: CHAT_COMPLETIONS_URL,
    model: selectedModel,
    statusCode: response.status,
    responseMessage,
    success: response.ok,
    openrouterReachable: response.status !== 0,
    modelResponded: Boolean(response.ok && content)
  });

  if (!response.ok) {
    const normalized = normalizeError({
      status: response.status,
      message: responseMessage,
      type: data.error?.type,
      code: data.error?.code
    });
    const error = new Error(normalized.message);
    error.status = response.status;
    error.type = normalized.type;
    error.debug = { ...debug, success: false, errorType: normalized.type };
    throw error;
  }

  return { data, content, debug };
}

async function fetchOpenRouterModels(apiKey, origin) {
  let response;
  try {
    response = await fetch(MODELS_URL, {
      method: "GET",
      headers: apiKey ? openRouterHeaders(apiKey, origin) : { "Content-Type": "application/json", "HTTP-Referer": origin, "X-Title": PROJECT_TITLE }
    });
  } catch (fetchError) {
    const normalized = normalizeError({ message: fetchError?.message || "fetch failed" });
    return {
      ok: false,
      status: 500,
      error: normalized,
      debug: buildDebug({
        targetUrl: MODELS_URL,
        model: "models",
        statusCode: null,
        responseMessage: fetchError?.message || "fetch failed",
        success: false,
        openrouterReachable: false,
        modelResponded: false,
        errorType: normalized.type
      }),
      data: {}
    };
  }
  const data = await parseOpenRouterBody(response);
  const responseMessage = data.error?.message || data.message || response.statusText || "";
  const debug = buildDebug({
    targetUrl: MODELS_URL,
    model: "models",
    statusCode: response.status,
    responseMessage,
    success: response.ok,
    openrouterReachable: response.status !== 0,
    modelResponded: response.ok
  });

  if (!response.ok) {
    const normalized = normalizeError({ status: response.status, message: responseMessage, type: data.error?.type, code: data.error?.code });
    return { ok: false, status: response.status, error: normalized, debug, data };
  }

  return { ok: true, status: response.status, debug, data };
}

const errorResponse = (error) => {
  const status = error.status || 500;
  const normalized = normalizeError({ status, message: error.message, type: error.type, code: error.code });
  return json(status, {
    error: normalized.message,
    errorType: normalized.type,
    debug: error.debug || buildDebug({
      targetUrl: CHAT_COMPLETIONS_URL,
      model: "unknown",
      statusCode: status,
      responseMessage: error.message,
      success: false,
      openrouterReachable: false,
      modelResponded: false,
      errorType: normalized.type
    })
  });
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { action, imageBase64, prompt, model: requestedModel, supportsVision } = JSON.parse(event.body || "{}");
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const apiKey = bearerToken || process.env.OPENROUTER_API_KEY;
    const origin = getRequestOrigin(event);
    const model = requestedModel || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

    if (action === "models") {
      const modelsResult = await fetchOpenRouterModels(apiKey, origin);
      if (!modelsResult.ok) {
        return json(modelsResult.status, {
          error: modelsResult.error.message,
          errorType: modelsResult.error.type,
          debug: { ...modelsResult.debug, errorType: modelsResult.error.type }
        });
      }
      return json(200, { models: modelsResult.data.data || [], debug: modelsResult.debug });
    }

    if (!apiKey) {
      return json(401, {
        error: "请在系统设置中填写 OpenRouter API Key",
        errorType: "missing_api_key",
        debug: buildDebug({
          targetUrl: CHAT_COMPLETIONS_URL,
          model,
          statusCode: 401,
          responseMessage: "Missing OpenRouter API key",
          success: false,
          openrouterReachable: false,
          modelResponded: false,
          errorType: "missing_api_key"
        })
      });
    }

    if (action === "basic-test") {
      const modelsResult = await fetchOpenRouterModels(apiKey, origin);
      if (!modelsResult.ok) {
        return json(modelsResult.status, {
          ok: false,
          error: modelsResult.error.message,
          errorType: modelsResult.error.type,
          debug: { ...modelsResult.debug, errorType: modelsResult.error.type }
        });
      }

      try {
        const chat = await callOpenRouterChat({
          apiKey,
          origin,
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: "Reply with JSON only: {\"ok\":true}" }],
          maxTokens: 16
        });
        return json(200, { ok: true, debug: chat.debug });
      } catch (error) {
        return json(200, {
          ok: true,
          warning: error.message,
          errorType: error.type,
          debug: {
            ...error.debug,
            openrouterReachable: true,
            success: false
          }
        });
      }
    }

    if (action === "test-model") {
      const testContent = Boolean(supportsVision)
        ? [
            { type: "text", text: "Reply with JSON only: {\"ok\":true}" },
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=" }
            }
          ]
        : "Reply with JSON only: {\"ok\":true}";

      const chat = await callOpenRouterChat({
        apiKey,
        origin,
        model,
        messages: [{ role: "user", content: testContent }],
        maxTokens: 24
      });
      return json(200, { ok: Boolean(chat.content), debug: chat.debug });
    }

    if (action === "test") {
      const chat = await callOpenRouterChat({
        apiKey,
        origin,
        model,
        messages: [{ role: "user", content: "Hello, reply with JSON only: {\"status\":\"ok\"}" }],
        maxTokens: 24
      });
      return json(200, { ok: Boolean(chat.content), debug: chat.debug });
    }

    if (!prompt) return json(400, { error: "Missing prompt", errorType: "bad_request" });

    const content = [
      {
        type: "text",
        text: `${prompt}\n\nReturn valid JSON only. Do not wrap it in markdown.`
      }
    ];

    if (imageBase64) {
      content.push({
        type: "image_url",
        image_url: { url: imageBase64 }
      });
    }

    const chat = await callOpenRouterChat({
      apiKey,
      origin,
      model,
      messages: [{ role: "user", content }],
      maxTokens: 1024
    });

    return json(200, { result: extractJson(chat.content || "{}"), debug: chat.debug });
  } catch (error) {
    console.error("OpenRouter function error:", error);
    return errorResponse(error);
  }
}
