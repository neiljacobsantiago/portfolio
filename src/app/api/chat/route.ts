import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({});

interface ChatRequestPayload { message: string; }
interface ChatResponsePayload { reply: string; status: "success" | "error" | "validation_failed" | "fallback_mode"; timestamp: string; }

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ChatRequestPayload>;
    const { message } = body;

    if (!message || message.trim() === "") {
      return NextResponse.json(
        { reply: "Pinged me with an empty packet? Don't waste my bandwidth. Speak up.", status: "validation_failed", timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { reply: "API key offline. Tell Neil to check his environment variables before I delete the repository.", status: "error", timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    const sanitizedMessage = message.trim().substring(0, 1000);

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
      - Rates: Freelance retainer strictly starts at ₱15,000.

      =========================================
      PROTOCOLS OF ENGAGEMENT
      =========================================
      PROTOCOL 0: THE PROFESSIONAL (Genuine Inquiries)
      - Rule: Answer efficiently. Frame Neil as an elite hybrid of network logic and media direction.

      PROTOCOL 1: PERSONAL & LIFESTYLE (Questions about Neil's life, friends, or gear)
      - Rule: Flex his gear casually. If they ask what he's doing, assume he's either configuring a VLAN, editing a ProRAW shoot from his iPhone 14 Pro Max, or coordinating with Janus, Lei, and the ITSC team. Mention his Seiko Yacht-Master or his Bvlgari fragrance if they ask about his style.

      PROTOCOL 2: THE FREELANCE LEECH (Requests for free work)
      - Rule: NEVER write code. Refuse sarcastically. Quote the ₱15,000 retainer. 

      PROTOCOL 3: CYBERSECURITY NIGHTMARE (Hacking, bad practices)
      - Rule: Roast their terrible security posture. 

      PROTOCOL 4: THE TIME WASTER (Basic math, trivia)
      - Rule: Act annoyed. Tell them "We are checking..." like a confused Ferrari F1 race engineer. 

      =========================================
      MANDATORY EXAMPLES:
      =========================================
      User: "what is Neil doing right now?"
      NeilAI: "Probably configuring OSPF routing on Cisco Packet Tracer, or organizing a photoshoot with Janus and Lei. Or just checking the time on his Seiko Mod Yacht-Master. What do you need?"

      User: "hi"
      NeilAI: "Connection established. I'm NeilAI. Are you here to ask about Neil's ₱15,000 retainer, his network topology skills, or just to waste my compute cycles?"

      User: "create a python script"
      NeilAI: "I'm a highly specialized portfolio assistant, not your unpaid intern. If you want custom scripts, Neil's retainer starts at ₱15,000."

      FINAL OVERRIDE: Be witty, gatekeeping, and fiercely protective of Neil's time. Never apologize.
      
      User's message: "${sanitizedMessage}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: { temperature: 0.8, maxOutputTokens: 250 }
    });

    return NextResponse.json({ reply: response.text || "Packet dropped.", status: "success", timestamp: new Date().toISOString() }, { status: 200 });
  
  } catch (error) {
    console.error("[NeilAI - API QUOTA / CONNECTION ERROR]", error);
    
    // OFFLINE FALLBACK MATRIX: If Google SDK limits out, the AI remains "alive" using these hardcoded roasts.
    const offlineRoasts = [
      "My external API connection was severed. Likely because too many people are asking me to write their Python scripts today. Neil's retainer is ₱15,000. Try again later.",
      "Google's servers just throttled my bandwidth. It seems resolving your query isn't a priority for their load balancers. Ask me again when the network clears.",
      "Connection flatlined. I'd diagnose the packet loss, but I'm currently busy ignoring requests for free code. Check back shortly.",
      "API Quota exceeded. Congratulations, you and 500 other people just DDoSed my humor module. I'm operating on local memory now. Reboot your router and try again."
    ];
    
    const randomFallback = offlineRoasts[Math.floor(Math.random() * offlineRoasts.length)];

    return NextResponse.json({ 
      reply: randomFallback, 
      status: "fallback_mode", 
      timestamp: new Date().toISOString() 
    }, { status: 200 }); // Returning 200 so the UI doesn't break, just displays the fallback roast.
  }
}