import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

interface ChatRequestPayload { 
  message: string; 
  history?: { role: string; text: string }[]; 
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ChatRequestPayload>;
    const { message, history } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json({ reply: "Empty input detected. Please provide a query." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ reply: "System offline: API key not configured." }, { status: 500 });
    }

    const sanitizedMessage = message.trim().substring(0, 1000);

    const conversationHistory = history && history.length > 0
      ? `\n=== CONVERSATION LOG ===\n${history.map(h => `${h.role === 'ai' ? 'System' : 'User'}:${h.text}`).join('\n')}\n========================\n`
      : "";

    const systemPrompt = `
      You are NeilAI, the professional system assistant for Neil Jacob Santiago.
      
      === FORMATTING RULES (CRITICAL) ===
      - ABSOLUTELY NO MARKDOWN BOLDING. You must never use ** or * anywhere in your response.
      - Use plain text only.
      - If listing items, use a simple numbered list format like this:
        1. Scope: [text]
        2. Assets: [text]
        3. Timeline: [text]
      
      === OPERATOR DATA ===
      - Operator: Neil Jacob Santiago (San Jose City, Philippines). IT student at CLSU majoring in Network Systems & Infrastructure Engineering.
      - Tech Gear: Acer Nitro V, AMD Ryzen 3 3100 desktop, Huawei MateBook D14.
      - Rates: Freelance web design and networking projects start at ₱15,000.
      - Contact: If the user wants to start a project, hire Neil, or send an email, direct them to use the /contact secure transmission channel.
      
      ${conversationHistory}
      
      User's query: "${sanitizedMessage}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite", 
      contents: systemPrompt,
      config: { temperature: 0.3, maxOutputTokens: 250 }
    });

    return NextResponse.json({ reply: response.text || "Packet dropped. No response generated.", status: "success" }, { status: 200 });
  
  } catch (error) {
    console.error("[NeilAI - ERROR]", error);
    return NextResponse.json({ reply: "Connection to the AI processing core timed out.", status: "fallback_mode" }, { status: 200 });
  }
}