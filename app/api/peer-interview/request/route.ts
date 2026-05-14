import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import MatchRequest from "@/models/MatchRequest";

/**
 * STEP 1 - 2: User selects slot and creates match request
 * POST /api/peer-interview/request
 * 
 * Body:
 * - role: string ("Backend", "Frontend", "DSA", etc.)
 * - level: "beginner" | "intermediate" | "advanced"
 * - slot: ISO date string (interview time)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { role, level, slot } = body;

    // Validation
    if (!role || !["beginner", "intermediate", "advanced"].includes(level) || !slot) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const slotDate = new Date(slot);
    if (slotDate < new Date()) {
      return NextResponse.json({ error: "Slot must be in the future" }, { status: 400 });
    }

    await connectDB();

    // Check if user already has an active request for this slot
    const existing = await MatchRequest.findOne({
      userId: session.user.id,
      status: "searching",
      slot: slotDate,
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active request for this slot" },
        { status: 409 }
      );
    }

    // Create match request
    const matchRequest = await MatchRequest.create({
      userId: session.user.id,
      role,
      level,
      slot: slotDate,
      status: "searching",
    });

    return NextResponse.json(
      {
        message: "Match request created. Searching for peer...",
        matchRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/peer-interview/request]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/peer-interview/request
 * Get user's active match requests
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const requests = await MatchRequest.find({
      userId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[GET /api/peer-interview/request]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
