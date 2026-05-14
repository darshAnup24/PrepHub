import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";
import User from "@/models/User";

/**
 * STEP 13-14: Post-interview verification and rating
 * POST /api/peer-interview/complete
 * 
 * Body:
 * - sessionId: string
 * - peerShowedUp: boolean
 * - punctuality?: number (1-5)
 * - communication?: number (1-5)
 * - usefulness?: number (1-5)
 * - feedback?: string
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, peerShowedUp, punctuality, communication, usefulness, feedback } = body;

    if (!sessionId || peerShowedUp === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (peerShowedUp) {
      if (!punctuality || !communication || !usefulness) {
        return NextResponse.json({ error: "Missing required ratings" }, { status: 400 });
      }
      if (![punctuality, communication, usefulness].every((v) => v >= 1 && v <= 5)) {
        return NextResponse.json(
          { error: "Ratings must be between 1 and 5" },
          { status: 400 }
        );
      }
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
    const ratingField = isUser1 ? "user1Rating" : "user2Rating";

    // Store rating
    (interviewSession[ratingField as keyof typeof interviewSession] as any) = {
      peerShowedUp,
      punctuality: peerShowedUp ? punctuality : undefined,
      communication: peerShowedUp ? communication : undefined,
      usefulness: peerShowedUp ? usefulness : undefined,
      feedback,
      ratedAt: new Date(),
    };

    const otherUserId = isUser1 ? interviewSession.user2Id : interviewSession.user1Id;

    // Handle No-Show Penalty
    if (!peerShowedUp) {
      await User.findByIdAndUpdate(otherUserId, { $inc: { noShowCount: 1 } });
    }

    // Check if both users have rated, or if it's been marked as a no-show
    if (interviewSession.user1Rating && interviewSession.user2Rating) {
      interviewSession.status = "completed";
      
      // Award credits based on ratings only if they showed up
      if (peerShowedUp) {
        const avgRating = (punctuality + communication + usefulness) / 3;
        let creditsEarned = 10;
        if (avgRating >= 4.5) creditsEarned += 5;
        else if (avgRating >= 4) creditsEarned += 3;

        const userDoc = await User.findById(session.user.id);
        if (userDoc && "credits" in userDoc) {
          (userDoc as any).credits = ((userDoc as any).credits || 0) + creditsEarned;
          await userDoc.save();
        }
      }
    } else {
      // If one user submitted, mark as completed from their side
      // The session globally can become 'completed' once both are done, 
      // but to prevent blocking forever we can just keep it pending_feedback until both rate
      // or a cron job cleans it up later.
    }

    await interviewSession.save();

    return NextResponse.json({
      message: "Rating submitted successfully",
      session: interviewSession,
    });
  } catch (error) {
    console.error("[POST /api/peer-interview/complete]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
