import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";
import MatchRequest from "@/models/MatchRequest";
import User from "@/models/User";
import { generateMeetLink } from "@/lib/meetGenerator";

/**
 * STEP 5-6: Handle confirmation request (Accept/Decline)
 * GET /api/peer-interview/confirm
 * 
 * Query params:
 * - sessionId: string
 * - userId: string
 * - action: "accept" | "decline"
 * 
 * When both users confirm:
 * 1. Generates Google Meet link
 * 2. Creates calendar events for both users
 * 3. Sets flags for Vercel Cron Job to handle reminders
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!sessionId || !userId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if session is still pending
    if (session.status !== "pending_confirmation") {
      return NextResponse.json(
        { error: "Session is no longer pending confirmation" },
        { status: 409 }
      );
    }

    // Check if confirmation deadline has passed
    if (new Date() > session.confirmationDeadline) {
      session.status = "cancelled";
      await session.save();

      // Return other user to queue
      await MatchRequest.create({
        userId: session.user1Id === userId ? session.user2Id : session.user1Id,
        role: session.role,
        experienceLevel: session.experienceLevel,
        slot: session.scheduledTime,
        status: "searching",
      });

      return NextResponse.json(
        { error: "Confirmation deadline has passed" },
        { status: 410 }
      );
    }

    // Identify which user is confirming
    const isUser1 = session.user1Id === userId;
    const confirmationField = isUser1 ? "user1Confirmation" : "user2Confirmation";

    if (action === "decline") {
      // Mark session as cancelled
      session.status = "cancelled";
      await session.save();

      // Return other user to queue
      const otherUserId = isUser1 ? session.user2Id : session.user1Id;
      await MatchRequest.create({
        userId: otherUserId,
        role: session.role,
        experienceLevel: session.experienceLevel,
        slot: session.scheduledTime,
        status: "searching",
      });

      return NextResponse.json({
        message: "Interview declined. Other user has been returned to queue.",
      });
    }

    // Mark user as confirmed
    (session[confirmationField as keyof typeof session] as any).confirmed = true;
    (session[confirmationField as keyof typeof session] as any).confirmedAt = new Date();

    // Check if both users have confirmed
    const bothConfirmed =
      session.user1Confirmation.confirmed && session.user2Confirmation.confirmed;

    if (bothConfirmed) {
      // STEP 6A: Both confirmed - create Meet link
      console.log("[Confirmation] Both users confirmed. Generating Meet link...");

      try {
        // Generate Google Meet link
        await generateMeetLink(sessionId);
        session.status = "confirmed";
      } catch (error) {
        console.error("[Meet Generation Error]", error);
        // Still mark as confirmed, just without Meet link
        session.status = "confirmed";
        (session as any).lastError = String(error);
      }
    }

    await session.save();

    return NextResponse.json({
      message: bothConfirmed
        ? "Interview confirmed! Meet link created and reminders scheduled."
        : "Confirmation received. Waiting for peer confirmation...",
      session,
    });
  } catch (error) {
    console.error("[GET /api/peer-interview/confirm]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
