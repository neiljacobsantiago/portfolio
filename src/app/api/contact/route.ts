import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, subject, message } = body;

    if (!email || !message) {
      return NextResponse.json({ error: "Missing required payload parameters." }, { status: 400 });
    }

    // Note: To send real emails, install 'resend' (npm install resend) 
    // and initialize it here using process.env.RESEND_API_KEY.
    // For now, this validates the payload and returns a success code to the frontend.

    console.log(`[SECURE_TX] Incoming message from ${email}`);
    console.log(`[SECURE_TX] Subject: ${subject}`);
    console.log(`[SECURE_TX] Payload: ${message}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return NextResponse.json({ success: true, message: "Transmission accepted." }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Transmission failed due to server error." }, { status: 500 });
  }
}