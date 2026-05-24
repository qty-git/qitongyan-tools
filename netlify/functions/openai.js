import OpenAI from "openai";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  },
  body: JSON.stringify(body)
});

const extractJson = (text = "{}") => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1].trim() : trimmed);
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: "请在 Netlify Environment Variables 中配置 OPENAI_API_KEY" });
  }

  try {
    const { action, imageBase64, prompt } = JSON.parse(event.body || "{}");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    if (action === "test") {
      const response = await client.responses.create({
        model,
        input: "Hello, reply with JSON only: {\"status\":\"ok\"}",
        text: { format: { type: "json_object" } }
      });
      return json(200, { ok: Boolean(response.output_text) });
    }

    if (!prompt) return json(400, { error: "Missing prompt" });

    const content = [
      {
        type: "input_text",
        text: `${prompt}\n\nReturn valid JSON only. Do not wrap it in markdown.`
      }
    ];

    if (imageBase64) {
      content.push({
        type: "input_image",
        image_url: imageBase64
      });
    }

    const response = await client.responses.create({
      model,
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } }
    });

    return json(200, { result: extractJson(response.output_text || "{}") });
  } catch (error) {
    console.error("OpenAI function error:", error);
    return json(error.status || 500, {
      error: error.message || "OpenAI request failed"
    });
  }
}
