import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";

/**
 * POST /api/jobs/ready-check
 * Called by QStash to send ready check prompts (10 mins before interview)
 * 
 * Payload:
 * {
 *   sessionId: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    await connectDB();

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "confirmed") {
      console.log(`[Ready Check Job] Session ${sessionId} not confirmed, skipping`);
      return NextResponse.json({ message: "Session not in confirmed state" });
    }

    // In production, send a webhook/notification to frontend
    // This could trigger:
    // 1. WebSocket notification to connected clients
    // 2. Push notification via service worker
    // 3. In-app notification when user opens page
    
    console.log(`[Ready Check Job] Triggering ready check for session ${sessionId}`);

    // Update session to flag that ready check was triggered
    await InterviewSession.findByIdAndUpdate(sessionId, {
      $set: {
        "readyCheckStatus.checkedAt": new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ready check triggered",
    });
  } catch (error) {
    console.error("[Ready Check Job Error]", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
