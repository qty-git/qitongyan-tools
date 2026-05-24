import OpenAI from "openai";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  },
  body: JSON.stringify(body)
});

const extractJson = (text = "{}") => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1].trim() : trimmed);
};

const toFriendlyError = (error) => {
  const message = error?.message || "OpenRouter request failed";
  const status = error?.status || error?.code;
  const lower = String(message).toLowerCase();

  if (status === 401 || lower.includes("invalid api key") || lower.includes("no auth")) {
    return "API Key 无效";
  }
  if (status === 404 || lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist"))) {
    return "模型不存在";
  }
  if (status === 402 || status === 429 || lower.includes("insufficient") || lower.includes("quota") || lower.includes("credit") || lower.includes("balance")) {
    return "余额不足";
  }
  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("timeout")) {
    return "网络错误";
  }
  return message;
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { action, imageBase64, prompt, model: requestedModel, baseURL: requestedBaseURL } = JSON.parse(event.body || "{}");
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const apiKey = bearerToken || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return json(500, { error: "请在系统设置中填写 OpenRouter API Key" });
    }

    const baseURL = requestedBaseURL || process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model = requestedModel || process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";
    const client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        "HTTP-Referer": "https://tranquil-madeleine-38cd80.netlify.app",
        "X-Title": "Fashion AI Studio"
      }
    });

    if (action === "test") {
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Hello, reply with JSON only: {\"status\":\"ok\"}" }]
      });
      return json(200, { ok: Boolean(response.choices?.[0]?.message?.content) });
    }

    if (!prompt) return json(400, { error: "Missing prompt" });

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

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content }]
    });

    return json(200, { result: extractJson(response.choices?.[0]?.message?.content || "{}") });
  } catch (error) {
    console.error("OpenRouter function error:", error);
    return json(error.status || 500, {
      error: toFriendlyError(error)
    });
  }
}
