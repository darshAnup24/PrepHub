import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";
import User from "@/models/User";
import { sendInterviewReminder } from "@/lib/resend";

/**
 * POST /api/jobs/reminder
 * Called by QStash to send interview reminders
 * 
 * Payload:
 * {
 *   sessionId: string,
 *   minutesBefore: number,
 *   type: "early" | "final"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, minutesBefore, type } = body;

    if (!sessionId || minutesBefore === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "confirmed") {
      console.log(`[Reminder Job] Session ${sessionId} not in confirmed state, skipping`);
      return NextResponse.json({ message: "Session not confirmed, reminder skipped" });
    }

    // Get user details
    const [user1, user2] = await Promise.all([
      User.findById(session.user1Id).select("email name").lean(),
      User.findById(session.user2Id).select("email name").lean(),
    ]);

    if (!user1 || !user2) {
      return NextResponse.json({ error: "Users not found" }, { status: 404 });
    }

    // Send reminders to both users
    await Promise.all([
      sendInterviewReminder(
        user1.email,
        {
          name: user1.name,
          peerName: user2.name,
          role: session.role,
          startTime: session.scheduledTime,
          meetLink: session.googleMeetLink || "#",
        },
        minutesBefore
      ),
      sendInterviewReminder(
        user2.email,
        {
          name: user2.name,
          peerName: user1.name,
          role: session.role,
          startTime: session.scheduledTime,
          meetLink: session.googleMeetLink || "#",
        },
        minutesBefore
      ),
    ]);

    console.log(`[Reminder Job] Reminders sent for session ${sessionId} (${minutesBefore} mins)`);

    return NextResponse.json({
      success: true,
      message: `Reminders sent ${minutesBefore} minutes before`,
    });
  } catch (error) {
    console.error("[Reminder Job Error]", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
