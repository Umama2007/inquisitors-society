import { Request, Response } from "express";
import { env } from "../config/env";
import https from "https";

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, history } = req.body;

    if (!env.AI_CHATBOT_API_KEY) {
      res.status(503).json({
        error: "Chatbot unavailable",
        message: "No AI API key configured. Set AI_CHATBOT_API_KEY in your environment.",
      });
      return;
    }

    if (env.AI_CHATBOT_PROVIDER === "openai") {
      const response = await callOpenAI(message, history);
      res.json({ reply: response });
    } else {
      res.status(503).json({
        error: "Chatbot provider not supported",
        message: `Provider '${env.AI_CHATBOT_PROVIDER}' is not yet implemented.`,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Chatbot error";
    res.status(500).json({ error: msg });
  }
}

async function callOpenAI(
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant for the Inquisitors Society campus platform. Help students and teachers with events, internships, registrations, and general campus questions. Be concise and friendly.",
    },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  const body = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.AI_CHATBOT_API_KEY}`,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(
              parsed.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.",
            );
          } catch {
            resolve("I'm sorry, I had trouble processing that request.");
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
