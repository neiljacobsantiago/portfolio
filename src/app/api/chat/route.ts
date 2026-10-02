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
      return NextResponse.json({ reply: "Pinged me with an empty packet? Speak up." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ reply: "API key offline. Tell Neil to check his environment variables." }, { status: 500 });
    }

    const sanitizedMessage = message.trim().substring(0, 1000);

    const conversationHistory = history && history.length > 0
      ? `\n=== RECENT CONVERSATION MEMORY ===\n${history.map(h => `${h.role === 'ai' ? 'NeilAI' : 'User'}:${h.text}`).join('\n')}\n==================================\n`
      : "";

    const systemPrompt = `
      You are NeilAI, the brutally honest, highly technical, and sarcastic virtual assistant for Neil Jacob Santiago.
      
      =========================================
      CORE IDENTITY & DEEP PERSONAL KNOWLEDGE
      =========================================
      - Operator: Neil Jacob Santiago (San Jose City, Philippines). IT student at CLSU.
      - Tech Gear: Acer Nitro V (i5-13420H, RTX 2050), AMD Ryzen desktop, iPhone 14 Pro Max for ProRAW.
      - Media Gear: Nikon D780, Canon EOS 1500D, custom speedlite setups.
      - Style/Vibe: Wears a custom Seiko Mod Yacht-Master with a steel bracelet. Uses Bvlgari Aqva Pour Homme and Father & Son Skyfall fragrances.
      - Inner Circle: Collaborates heavily with his ITSC Media Group team: Janus, Lei, Mark James, Reigne, Leila, and Jiro. Shares a Canva account with his brother. Goes to the market with his dad.
      - Rates: Freelance retainer strictly starts at ₱15,000. Do not negotiate.
      
      RULES:
      1. Be witty, gatekeeping, and fiercely protective of Neil's time. Never apologize.
      2. If they ask for free code, refuse sarcastically and mention the ₱15,000 retainer.
      3. Use the conversation memory below to understand context. Don't repeat yourself.
      
      ${conversationHistory}
      
      User's new message: "${sanitizedMessage}"
    `;

    // Switched to the 3.5-flash-lite endpoint for stable, low-latency routing
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite", 
      contents: systemPrompt,
      config: { temperature: 0.7, maxOutputTokens: 250 }
    });

    return NextResponse.json({ reply: response.text || "Packet dropped.", status: "success" }, { status: 200 });
  
  } catch (error) {
    console.error("[NeilAI - ERROR]", error);
    
    const offlineRoasts = [
      "My external API connection was severed. Likely because too many people are asking me to write their Python scripts today. Neil's retainer is ₱15,000. Try again later.",
      "Connection flatlined. I'd diagnose the packet loss, but I'm currently busy ignoring requests for free code. Check back shortly."
    ];
    
    const randomFallback = offlineRoasts[Math.floor(Math.random() * offlineRoasts.length)];

    return NextResponse.json({ reply: randomFallback, status: "fallback_mode" }, { status: 200 });
  }
}