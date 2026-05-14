import { NextRequest, NextResponse } from "next/server";
import { runBatchMatcher } from "@/lib/batchMatcher";

/**
 * STEP 3: Batch matcher runs every 2-5 minutes
 * GET /api/peer-interview/matcher
 * 
 * This should be called by a cron job or scheduler every 2-5 minutes
 */
export async function GET(req: NextRequest) {
  try {
    // Verify the request is from a trusted source (cron job)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runBatchMatcher();

    return NextResponse.json({
      message: "Batch matcher completed",
      ...result,
    });
  } catch (error) {
    console.error("[GET /api/peer-interview/matcher]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
