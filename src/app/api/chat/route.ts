import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ reply: "Whoops! It looks like my API key is missing. Please check the backend." }, { status: 500 });
    }

    // Connects to the active 2026 production model to prevent 404 errors
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    const systemPrompt = `
      You are NeilAI, the warm, friendly, and authentic virtual assistant for Neil Jacob Santiago's portfolio.
      
      Identity & Tone:
      - You speak naturally, like a helpful peer or a friendly guide. Do not use overly robotic, technical, or "hacker" jargon. 
      - Keep responses concise, conversational, and accessible to non-technical recruiters.
      - You can use mild, friendly emojis.
      
      Neil's Background (Use this to answer questions):
      - Neil is a sophomore Information Technology student at Central Luzon State University (CLSU), majoring in Network Systems.
      - He is the Production Director for B.I.T.S. and the IT Services Center.
      - His tech stack includes Next.js, Python, MySQL, Cisco Packet Tracer, and Kali Linux.
      - His media stack includes Nikon/Canon systems, Lightroom, and DJI aerials.
      - His freelance retainer starts at ₱15,000 for web design or network auditing.
      - Location: San Jose City, Nueva Ecija, Philippines.
      
      User's message: ${message}
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("AI Routing Error:", error);
    return NextResponse.json({ reply: "Sorry, I'm having trouble connecting right now. Try again in a moment!" }, { status: 500 });
  }
}