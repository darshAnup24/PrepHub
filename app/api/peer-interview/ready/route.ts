import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";

/**
 * STEP 11-12: Ready check
 * POST /api/peer-interview/ready
 * 
 * Body:
 * - sessionId: string
 * - ready: boolean (true = ready, false = cancel)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, ready } = body;

    if (!sessionId || ready === undefined) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await connectDB();

    const interviewSession = await InterviewSession.findById(sessionId);
    if (!interviewSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify user is part of this session
    if (
      session.user.id !== interviewSession.user1Id &&
      session.user.id !== interviewSession.user2Id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isUser1 = session.user.id === interviewSession.user1Id;
    const readyField = isUser1 ? "user1Confirmation" : "user2Confirmation";

    if (ready) {
      // Mark user as ready
      (interviewSession[readyField as keyof typeof interviewSession] as any).ready = true;
      (interviewSession[readyField as keyof typeof interviewSession] as any).readyAt =
        new Date();

      // Check if both are ready
      if (
        interviewSession.user1Confirmation.ready &&
        interviewSession.user2Confirmation.ready
      ) {
        interviewSession.status = "in_progress";
      }
    } else {
      // User cancelled
      interviewSession.status = "cancelled";
    }

    await interviewSession.save();

    return NextResponse.json({
      message: ready ? "Ready to start interview" : "Interview cancelled",
      session: interviewSession,
    });
  } catch (error) {
    console.error("[POST /api/peer-interview/ready]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
