import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";

/**
 * POST /api/jobs/auto-cancel
 * Called by QStash after interview time passes without both users joining
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

    // Check if interview time has passed
    const now = new Date();
    const sessionTime = new Date(session.scheduledTime);
    const timePassed = now.getTime() - sessionTime.getTime();

    if (timePassed < 15 * 60 * 1000) {
      // Less than 15 minutes have passed
      console.log(`[Auto Cancel Job] Too early to cancel session ${sessionId}`);
      return NextResponse.json({ message: "Session time not yet passed" });
    }

    // Check if session is still in progress (no one joined)
    if (session.status === "in_progress") {
      // If we're here and no one has joined, mark as no-show
      // In production, you'd have a way to detect if users actually joined
      
      console.log(`[Auto Cancel Job] Marking session ${sessionId} as no-show`);

      const updatedSession = await InterviewSession.findByIdAndUpdate(
        sessionId,
        {
          $set: {
            status: "no_show",
            completedAt: new Date(),
          },
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: "Session marked as no-show",
        session: updatedSession,
      });
    }

    return NextResponse.json({ message: "Session not in progress" });
  } catch (error) {
    console.error("[Auto Cancel Job Error]", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
