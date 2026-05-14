import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";

/**
 * GET /api/peer-interview/session/[id]
 * Get interview session details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await connectDB();

    const interviewSession = await InterviewSession.findById(id);
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

    return NextResponse.json({ session: interviewSession });
  } catch (error) {
    console.error("[GET /api/peer-interview/session/[id]]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
