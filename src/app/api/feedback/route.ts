import { NextResponse } from "next/server";
import { appendFeedback } from "@/services/feedback-store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type, reaction, name, message, page } = body as {
      type?: string;
      reaction?: string;
      name?: string;
      message?: string;
      page?: string;
    };

    if (type !== "reaction" && type !== "text") {
      return NextResponse.json({ error: "Invalid type. Use 'reaction' or 'text'." }, { status: 400 });
    }
    if (type === "reaction" && reaction !== "thumbs_up" && reaction !== "thumbs_down") {
      return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
    }
    if (type === "text" && (!message || !message.trim())) {
      return NextResponse.json({ error: "message is required for text feedback." }, { status: 400 });
    }

    const entry = appendFeedback({
      type: type as "reaction" | "text",
      reaction: type === "reaction" ? (reaction as "thumbs_up" | "thumbs_down") : undefined,
      name: name?.trim() || undefined,
      message: message?.trim() || undefined,
      page: page?.trim() || undefined,
    });

    return NextResponse.json({ ok: true, id: entry.id, timestamp: entry.timestamp });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}
