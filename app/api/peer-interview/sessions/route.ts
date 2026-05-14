import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";

/**
 * GET /api/peer-interview/sessions
 * Get all interview sessions for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const sessions = await InterviewSession.find({
      $or: [{ user1Id: session.user.id }, { user2Id: session.user.id }],
    })
      .sort({ scheduledTime: -1 })
      .lean();

    return NextResponse.json({ sessions, userId: session.user.id });
  } catch (error) {
    console.error("[GET /api/peer-interview/sessions]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
