import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const template = typeof body.template === "string" ? body.template.trim() : "";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "API key Gemini tidak dikonfigurasi. Set environment variable GEMINI_API_KEY atau GOOGLE_API_KEY." },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const promptText = template ? `${template}\n\nInput:\n${prompt}` : prompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
    });

    const result = response?.text ?? response?.data ?? "";

    if (!result) {
      return NextResponse.json({ error: "Tidak ada output dari AI." }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI API error:", error);
    const message = error instanceof Error ? error.message : "Server AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
